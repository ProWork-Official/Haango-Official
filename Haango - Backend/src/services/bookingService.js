import Booking from '../models/Booking.js';
import BuddyProfile from '../models/BuddyProfile.js';
import Activity from '../models/Activity.js';
import { calculateBookingPrice } from './pricingService.js';
import { notFound, badRequest, conflict, forbidden } from '../utils/errors.js';
import { generateBookingId } from '../utils/helpers.js';
import { env } from '../config/environment.js';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import CancellationRequest from '../models/CancellationRequest.js';
import User from '../models/User.js';
import { sendOtpEmail } from './emailService.js';
import LocationAccessLog from '../models/LocationAccessLog.js';
import CallSignal from '../models/CallSignal.js';
import { recordAdminAction } from './adminAuditService.js';
import { creditWallet } from './customerWalletService.js';
import { findAvailableCoupon } from './couponService.js';

const LOCATION_RETENTION_MS = 24 * 60 * 60 * 1000;
const LOCATION_STALE_MS = 2 * 60 * 1000;
const INDIA_OFFSET_MINUTES = 330;
const callSessions = new Map();
const callSubscribers = new Map();

function getIndiaCalendarDate(value) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
}

function parseBookingDate(value) {
  const dateValue = String(value || '');
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateValue);
  if (!dateMatch) return new Date(NaN);

  const date = new Date(Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
  ));
  if (
    date.getUTCFullYear() !== Number(dateMatch[1])
    || date.getUTCMonth() !== Number(dateMatch[2]) - 1
    || date.getUTCDate() !== Number(dateMatch[3])
  ) return new Date(NaN);
  return date;
}

function parseStartTime(value) {
  const timeValue = String(value || '').trim().toUpperCase();
  const twelveHourMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(timeValue);
  const twentyFourHourMatch = /^(\d{1,2}):(\d{2})$/.exec(timeValue);
  const match = twelveHourMatch || twentyFourHourMatch;
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || hours > (twelveHourMatch ? 12 : 23)) return null;
  if (twelveHourMatch) {
    if (hours === 12) hours = 0;
    if (match[3] === 'PM') hours += 12;
  }

  return { hours, minutes };
}

function getBookingStart(date, startTime) {
  const parsedTime = parseStartTime(startTime);
  if (!parsedTime) return new Date(NaN);

  const bookingStart = new Date(date);
  bookingStart.setUTCHours(parsedTime.hours, parsedTime.minutes, 0, 0);
  bookingStart.setTime(bookingStart.getTime() - INDIA_OFFSET_MINUTES * 60 * 1000);
  return bookingStart;
}

function getMeetingEnd(booking) {
  return meetingStart(booking).getTime() + Number(booking.duration || 0) * 60 * 60 * 1000;
}

async function logLocationAccess(bookingId, userId, action, request = {}) {
  await LocationAccessLog.create({
    bookingId,
    actorId: userId,
    action,
    ipAddress: request.ip || request.connection?.remoteAddress || '',
    userAgent: request.headers?.['user-agent'] || '',
  });
}

function purgeExpiredLocations(booking) {
  const cutoff = Date.now() - LOCATION_RETENTION_MS;
  booking.meeting.locations = (booking.meeting.locations || []).filter((location) => (
    location.updatedAt && new Date(location.updatedAt).getTime() >= cutoff
  ));
}

function clearBookingLocations(booking) {
  booking.meeting.locations = [];
}

export async function purgeExpiredBookingLocations() {
  const cutoff = new Date(Date.now() - LOCATION_RETENTION_MS);
  await Booking.updateMany(
    { 'meeting.locations.0': { $exists: true } },
    { $pull: { 'meeting.locations': { updatedAt: { $lt: cutoff } } } },
  );
}

export async function createBooking(customerId, data) {
  const buddy = await BuddyProfile.findById(data.buddyId);
  if (!buddy) throw notFound('Buddy not found');
  if (buddy.verificationStatus !== 'VERIFIED') throw badRequest('Buddy is not verified', 'BUDDY_NOT_VERIFIED');
  if (!buddy.isAvailable) throw badRequest('Buddy is not available', 'BUDDY_UNAVAILABLE');

  if (String(buddy.userId) === String(customerId)) {
    throw badRequest('Cannot book yourself', 'SELF_BOOKING');
  }

  const activity = await Activity.findById(data.activityId);
  if (!activity) throw notFound('Activity not found');
  if (!activity.isActive) throw badRequest('Activity is not active', 'ACTIVITY_INACTIVE');

  if (data.duration < env.minBookingDuration || data.duration > env.maxBookingDuration) {
    throw badRequest(`Duration must be ${env.minBookingDuration}-${env.maxBookingDuration} hours`, 'INVALID_DURATION');
  }

  const bookingDate = parseBookingDate(data.date);
  const bookingStart = getBookingStart(bookingDate, data.startTime);
  if (Number.isNaN(bookingDate.getTime()) || Number.isNaN(bookingStart.getTime())) {
    throw badRequest('Valid booking date and time required', 'INVALID_DATE_TIME');
  }
  if (bookingStart < new Date()) throw badRequest('Cannot book in the past', 'PAST_DATE');

  const conflicting = await Booking.findOne({
    buddyId: buddy.userId,
    date: bookingDate,
    startTime: data.startTime,
    bookingStatus: { $in: ['PENDING', 'CONFIRMED', 'ONGOING'] },
  });
  if (conflicting) throw conflict('Buddy already booked for this time slot', 'DOUBLE_BOOKING');

  const { buddyRate, buddyFee, platformFee, totalAmount } = calculateBookingPrice(buddy.hourlyRate, data.duration);
  const customer = await User.findById(customerId);
  const coupon = data.couponCode
    ? await findAvailableCoupon(data.couponCode, customer, 'BOOKING')
    : null;
  const couponDiscount = coupon ? Math.min(coupon.coupon.amount, totalAmount) : 0;

  const booking = await Booking.create({
    bookingId: generateBookingId(),
    customerId,
    buddyId: buddy.userId,
    buddyProfileId: buddy._id,
    activityId: activity._id,
    activitySlug: activity.slug,
    date: bookingDate,
    startTime: data.startTime,
    duration: data.duration,
    meetingLocation: data.meetingLocation,
    buddyRate,
    platformFee,
    totalAmount,
    amountDue: totalAmount,
    couponCode: String(data.couponCode || '').trim().toUpperCase(),
    couponDiscount,
    customerNotes: data.customerNotes || '',
    paymentStatus: 'PENDING',
    bookingStatus: 'PENDING',
  });

  return booking;
}

export async function getCustomerBookings(customerId, status) {
  const query = { customerId };
  if (status) query.bookingStatus = status;
  return Booking.find(query)
    .populate('buddyProfileId', 'displayName city profileImages')
    .populate('activityId', 'name slug emoji')
    .sort({ date: -1 });
}

export async function getBuddyBookings(buddyId, status) {
  const query = { buddyId };
  if (status) query.bookingStatus = status;
  return Booking.find(query)
    .populate('customerId', 'name email profileImage')
    .populate('activityId', 'name slug emoji')
    .sort({ date: -1 });
}

export async function getBookingById(bookingId, userId, userRole) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound('Booking not found');

  if (userRole === 'CUSTOMER' && String(booking.customerId) !== String(userId)) {
    throw forbidden('Not your booking');
  }
  if (userRole === 'BUDDY' && String(booking.buddyId) !== String(userId)) {
    throw forbidden('Not your booking');
  }

  return booking;
}

export async function cancelBooking(bookingId, userId, userRole) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound('Booking not found');

  if (userRole === 'CUSTOMER' && String(booking.customerId) !== String(userId)) {
    throw forbidden('Not your booking');
  }
  if (userRole === 'BUDDY' && String(booking.buddyId) !== String(userId)) {
    throw forbidden('Not your booking');
  }

  if (['COMPLETED', 'CANCELLED', 'REJECTED', 'ONGOING'].includes(booking.bookingStatus) || isCallUnlocked(booking)) {
    throw badRequest('Booking cannot be cancelled', 'INVALID_STATUS');
  }

  booking.bookingStatus = 'CANCELLED';
  clearBookingLocations(booking);
  await booking.save();
  return booking;
}

function meetingStart(booking) {
  const parsedTime = parseStartTime(booking.startTime) || { hours: 0, minutes: 0 };
  const date = getIndiaCalendarDate(booking.date);
  date.setUTCHours(parsedTime.hours, parsedTime.minutes, 0, 0);
  date.setTime(date.getTime() - INDIA_OFFSET_MINUTES * 60 * 1000);
  return date;
}
export function isCallUnlocked(booking) {
  if (booking.bookingStatus === 'ONGOING') return true;
  const start = meetingStart(booking);
  return Date.now() >= start.getTime() - 2 * 60 * 60 * 1000;
}
function isLocationUnlocked(booking) {
  if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.bookingStatus)) return false;
  if (booking.bookingStatus === 'ONGOING') return true;
  const now = Date.now();
  const start = meetingStart(booking).getTime();
  return now >= start - 2 * 60 * 60 * 1000 && now < getMeetingEnd(booking);
}
function isMeetingStartUnlocked(booking) {
  const start = meetingStart(booking);
  return Date.now() >= start.getTime() - 60 * 60 * 1000;
}
function assertParticipant(booking, userId) {
  if (![booking.customerId, booking.buddyId].some((id) => String(id) === String(userId))) throw forbidden('Not part of this booking');
}
function makeOtp() { return String(crypto.randomInt(100000, 1000000)); }

export async function issueMeetingOtp(bookingId, userId, phase) {
  if (!['START', 'END'].includes(phase)) throw badRequest('Invalid meeting phase', 'INVALID_PHASE');
  const booking = await Booking.findById(bookingId).select('+meeting.startOtpHash +meeting.endOtpHash +meeting.customerStartOtpHash +meeting.buddyStartOtpHash +meeting.customerEndOtpHash +meeting.buddyEndOtpHash');
  if (!booking) throw notFound('Booking not found');
  assertParticipant(booking, userId);
  if (String(booking.customerId) !== String(userId)) {
    throw forbidden('Only the customer can generate the meeting code');
  }
  if (phase === 'START' && !isMeetingStartUnlocked(booking)) throw forbidden('Meeting confirmation opens one hour before the meeting');
  if (phase === 'END' && booking.bookingStatus !== 'ONGOING') throw badRequest('Meeting has not started', 'INVALID_STATUS');
  const code = makeOtp();
  const hash = await bcrypt.hash(code, 12);
  const expires = new Date(Date.now() + 10 * 60 * 1000);
  booking.meeting[`customer${phase === 'START' ? 'Start' : 'End'}OtpHash`] = hash;
  booking.meeting[`${phase === 'START' ? 'start' : 'end'}VerifiedBy`] = [];
  booking.meeting[phase === 'START' ? 'startOtpExpiresAt' : 'endOtpExpiresAt'] = expires;
  await booking.save();
  const user = await User.findById(userId).select('email name');
  await sendOtpEmail(user.email, code, { name: user.name, purpose: 'meeting' });
  return { sent: true, code, expiresAt: expires, recipient: 'BUDDY' };
}

export async function verifyMeetingOtp(bookingId, userId, phase, code) {
  const booking = await Booking.findById(bookingId).select('+meeting.startOtpHash +meeting.endOtpHash +meeting.customerStartOtpHash +meeting.buddyStartOtpHash +meeting.customerEndOtpHash +meeting.buddyEndOtpHash');
  if (!booking) throw notFound('Booking not found');
  assertParticipant(booking, userId);
  if (String(booking.buddyId) !== String(userId)) {
    throw forbidden('Only the companion can enter the meeting code');
  }
  const key = phase === 'START' ? 'start' : 'end';
  const hashField = `customer${phase === 'START' ? 'Start' : 'End'}OtpHash`;
  const hash = booking.meeting[hashField];
  const expiry = booking.meeting[`${key}OtpExpiresAt`];
  if (!hash || !expiry || expiry < new Date() || !(await bcrypt.compare(String(code || ''), hash))) {
    throw badRequest('Invalid or expired meeting code', 'INVALID_OTP');
  }
  const verified = booking.meeting[`${key}VerifiedBy`];
  if (!verified.some((id) => String(id) === String(booking.customerId))) verified.push(booking.customerId);
  if (!verified.some((id) => String(id) === String(userId))) verified.push(userId);
  booking.meeting[hashField] = '';
  if (phase === 'START' && verified.length === 2) {
    booking.bookingStatus = 'ONGOING';
    booking.meeting.startedAt = new Date();
  }
  if (phase === 'END' && verified.length === 2) {
    booking.bookingStatus = 'COMPLETED';
    booking.meeting.endedAt = new Date();
    clearBookingLocations(booking);
  }
  await booking.save();
  return booking;
}

export async function requestCancellation(bookingId, userId, reason, details) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound('Booking not found');
  assertParticipant(booking, userId);
  if (['COMPLETED', 'CANCELLED', 'REJECTED', 'ONGOING'].includes(booking.bookingStatus) || Date.now() >= meetingStart(booking).getTime()) throw badRequest('Booking cannot be cancelled after the meeting starts', 'INVALID_STATUS');
  if (!isCallUnlocked(booking)) throw badRequest('Cancellation requests open two hours before the meeting', 'CANCELLATION_NOT_LOCKED');
  if (reason === 'OTHER' && !String(details || '').trim()) throw badRequest('Please explain the other reason', 'DETAILS_REQUIRED');
  return CancellationRequest.create({ bookingId, requesterId: userId, reason, details });
}
export async function getCancellationRequests(status) {
  return CancellationRequest.find(status ? { status } : {}).populate('bookingId requesterId', 'bookingId date startTime bookingStatus name email').sort({ createdAt: -1 });
}
export async function reviewCancellation(requestId, adminId, status, adminNotes = '', requestContext) {
  const request = await CancellationRequest.findById(requestId).populate('bookingId');
  if (!request) throw notFound('Cancellation request not found');
  if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) throw badRequest('Invalid cancellation decision');
  request.status = status; request.adminNotes = adminNotes; request.reviewedBy = adminId; request.reviewedAt = new Date();
  if (status === 'APPROVED') {
    request.bookingId.bookingStatus = 'CANCELLED';
    clearBookingLocations(request.bookingId);
    if (request.bookingId.paymentStatus === 'PAID') {
      const creditAmount = Math.max(0, Number(request.bookingId.totalAmount || 0) - Number(request.bookingId.couponDiscount || 0));
      await creditWallet(request.bookingId.customerId, creditAmount, 'CANCELLATION_CREDIT', `cancellation-credit-${request.bookingId._id}`, { bookingId: request.bookingId._id, description: 'Wallet credit from approved cancelled booking' });
      request.bookingId.paymentStatus = 'REFUNDED';
      request.bookingId.walletCreditAmount = creditAmount;
    }
    await request.bookingId.save();
  }
  await request.save();
  await recordAdminAction({ actor: await User.findById(adminId), request: requestContext, action: 'CANCELLATION_DECISION', targetType: 'CancellationRequest', targetId: request._id, metadata: { status, bookingId: request.bookingId._id } });
  return request;
}
export async function getCallRoom(bookingId, userId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound('Booking not found');
  assertParticipant(booking, userId);
  if (!isCallUnlocked(booking)) throw forbidden('Internet call unlocks within two hours of the meeting');
  if (!booking.meeting.callRoomId) { booking.meeting.callRoomId = crypto.randomBytes(24).toString('hex'); await booking.save(); }
  return { roomId: booking.meeting.callRoomId, roomUrl: `${env.callProviderUrl}/${booking.meeting.callRoomId}` };
}

async function getCallBooking(bookingId, userId, requireUnlocked = true) {
  const booking = await Booking.findById(bookingId).select('customerId buddyId paymentStatus bookingStatus date startTime duration');
  if (!booking) throw notFound('Booking not found');
  assertParticipant(booking, userId);
  if (booking.paymentStatus !== 'PAID' || ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.bookingStatus)) {
    throw forbidden('Calling is unavailable for this booking');
  }
  if (requireUnlocked && !isCallUnlocked(booking)) throw forbidden('Calls unlock within two hours of the meeting');
  return booking;
}

export async function joinCall(bookingId, userId) {
  await getCallBooking(bookingId, userId);
  const key = String(bookingId);
  let session = callSessions.get(key);
  if (!session) {
    session = { participants: new Set(), messages: [], sequence: 0, lastActivity: Date.now() };
    callSessions.set(key, session);
  }
  const userKey = String(userId);
  const initiator = session.participants.size === 0;
  session.participants.add(userKey);
  session.lastActivity = Date.now();
  return { initiator, participantCount: session.participants.size };
}

export async function sendCallSignal(bookingId, userId, type, payload) {
  await getCallBooking(bookingId, userId);
  const session = callSessions.get(String(bookingId));
  if (!session || !session.participants.has(String(userId))) throw forbidden('Join the call before sending a signal');
  const signal = await CallSignal.create({ bookingId, senderId: userId, type, payload });
  session.messages.push({ sequence: ++session.sequence, senderId: String(userId), type, payload, createdAt: signal.createdAt.getTime() });
  session.lastActivity = Date.now();
  const subscribers = callSubscribers.get(String(bookingId)) || new Set();
  subscribers.forEach((subscriber) => {
    if (subscriber.userId !== String(userId)) subscriber.send(session.messages.at(-1));
  });
  return { sent: true, sequence: session.sequence };
}

export async function subscribeCallSignals(bookingId, userId, response) {
  await getCallBooking(bookingId, userId, false);
  const key = String(bookingId);
  const session = callSessions.get(key);
  const subscriber = { userId: String(userId), response, send: (message) => response.write(`data: ${JSON.stringify(message)}\n\n`) };
  if (!callSubscribers.has(key)) callSubscribers.set(key, new Set());
  callSubscribers.get(key).add(subscriber);
  const cleanup = () => {
    callSubscribers.get(key)?.delete(subscriber);
    if (!callSubscribers.get(key)?.size) callSubscribers.delete(key);
  };
  response.on('close', cleanup);
  subscriber.heartbeat = setInterval(() => response.write(': keep-alive\n\n'), 15000);
  response.on('close', () => clearInterval(subscriber.heartbeat));
  response.write(': connected\n\n');
  const activeRequest = await CallSignal.findOne({
    bookingId,
    type: 'CALL_REQUEST',
    senderId: { $ne: userId },
    createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
  }).sort({ createdAt: -1 }).lean();
  if (activeRequest) subscriber.send({
    sequence: 0,
    senderId: String(activeRequest.senderId),
    type: activeRequest.type,
    payload: activeRequest.payload,
    createdAt: activeRequest.createdAt.getTime(),
  });
}

export async function pollCallSignals(bookingId, userId, after = 0) {
  await getCallBooking(bookingId, userId, false);
  const session = callSessions.get(String(bookingId));
  if (session) session.lastActivity = Date.now();
  const signals = await CallSignal.find({
    bookingId,
    senderId: { $ne: userId },
    createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
  }).sort({ createdAt: 1 }).lean();
  return signals.map((signal) => ({
    sequence: signal.createdAt.getTime(),
    senderId: String(signal.senderId),
    type: signal.type,
    payload: signal.payload,
    createdAt: signal.createdAt.getTime(),
  }));
}

export async function leaveCall(bookingId, userId) {
  const session = callSessions.get(String(bookingId));
  if (session) {
    session.participants.delete(String(userId));
    session.messages.push({ sequence: ++session.sequence, senderId: String(userId), type: 'HANGUP', payload: {} });
    if (!session.participants.size) callSessions.delete(String(bookingId));
  }
  return { left: true };
}

export async function updateParticipantLocation(bookingId, userId, location, request) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound('Booking not found');
  assertParticipant(booking, userId);
  if (booking.paymentStatus !== 'PAID' || ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.bookingStatus)) {
    throw forbidden('Location sharing is unavailable for this booking');
  }
  if (!isLocationUnlocked(booking)) throw forbidden('Location sharing is locked outside the meeting window');
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw badRequest('Valid latitude and longitude are required', 'INVALID_LOCATION');
  }
  const nextLocation = {
    userId,
    latitude,
    longitude,
    accuracy: Number.isFinite(Number(location.accuracy)) ? Number(location.accuracy) : undefined,
    updatedAt: new Date(),
  };
  if (!booking.meeting.locations) booking.meeting.locations = [];
  purgeExpiredLocations(booking);
  const existingIndex = booking.meeting.locations.findIndex((item) => String(item.userId) === String(userId));
  if (existingIndex >= 0) booking.meeting.locations[existingIndex] = nextLocation;
  else booking.meeting.locations.push(nextLocation);
  await booking.save();
  await logLocationAccess(bookingId, userId, 'PUBLISH', request);
  return booking.meeting.locations;
}

export async function getParticipantLocations(bookingId, userId, request) {
  const booking = await Booking.findById(bookingId).select('customerId buddyId paymentStatus bookingStatus meeting.locations date startTime duration');
  if (!booking) throw notFound('Booking not found');
  assertParticipant(booking, userId);
  if (booking.paymentStatus !== 'PAID' || ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.bookingStatus)) {
    throw forbidden('Location sharing is unavailable for this booking');
  }
  if (!isLocationUnlocked(booking)) throw forbidden('Location sharing is locked outside the meeting window');
  purgeExpiredLocations(booking);
  await booking.save();
  await logLocationAccess(bookingId, userId, 'VIEW', request);
  return (booking.meeting.locations || []).map((location) => ({
    ...location.toObject(),
    isCurrent: String(location.userId) === String(userId),
    isStale: Date.now() - new Date(location.updatedAt).getTime() > LOCATION_STALE_MS,
  }));
}

export async function stopParticipantLocation(bookingId, userId, request) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound('Booking not found');
  assertParticipant(booking, userId);
  booking.meeting.locations = (booking.meeting.locations || []).filter((location) => String(location.userId) !== String(userId));
  await booking.save();
  await logLocationAccess(bookingId, userId, 'STOP', request);
  return booking.meeting.locations;
}

export async function updateBookingStatus(bookingId, buddyId, newStatus) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound('Booking not found');

  if (String(booking.buddyId) !== String(buddyId)) {
    throw forbidden('Not your booking');
  }

  const validTransitions = {
    CONFIRMED: ['PENDING'],
    REJECTED: ['PENDING'],
    ONGOING: ['CONFIRMED'],
    COMPLETED: ['ONGOING'],
  };

  const allowedFrom = validTransitions[newStatus];
  if (!allowedFrom || !allowedFrom.includes(booking.bookingStatus)) {
    throw badRequest(`Cannot transition from ${booking.bookingStatus} to ${newStatus}`, 'INVALID_TRANSITION');
  }

  booking.bookingStatus = newStatus;
  if (['COMPLETED', 'REJECTED'].includes(newStatus)) clearBookingLocations(booking);
  if (newStatus === 'COMPLETED') {
    const buddy = await BuddyProfile.findOne({ userId: booking.buddyId });
    if (buddy) {
      buddy.completedBookings += 1;
      await buddy.save();
    }
  }
  await booking.save();
  return booking;
}

export async function getAllBookings(filters = {}) {
  const { status, page = 1, limit = 20 } = filters;
  const query = {};
  if (status) query.bookingStatus = status;

  const skip = (page - 1) * limit;
  const [bookings, total] = await Promise.all([
    Booking.find(query).sort({ date: -1 }).skip(skip).limit(limit),
    Booking.countDocuments(query),
  ]);

  return { bookings, total };
}

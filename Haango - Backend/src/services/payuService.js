import crypto from 'node:crypto';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import BuddyProfile from '../models/BuddyProfile.js';
import Activity from '../models/Activity.js';
import { env } from '../config/environment.js';
import { badRequest, notFound } from '../utils/errors.js';
import * as bookingService from './bookingService.js';
import { sendBookingConfirmationEmails } from './emailService.js';

const PAYU_TEST_URL = 'https://test.payu.in/_payment';
const PAYU_PRODUCTION_URL = 'https://secure.payu.in/_payment';

function sha512(value) {
  return crypto.createHash('sha512').update(value).digest('hex');
}

function getPayuConfig() {
  if (!env.payuKey || !env.payuSalt) {
    throw badRequest('PayU payments are not configured', 'PAYMENT_CONFIGURATION_MISSING');
  }

  return {
    key: env.payuKey,
    salt: env.payuSalt,
    actionUrl: env.payuMode.toLowerCase() === 'production' ? PAYU_PRODUCTION_URL : PAYU_TEST_URL,
  };
}

function amountString(amount) {
  return Number(amount).toFixed(2);
}

export function createPayuRequestHash(fields, salt) {
  const values = [
    fields.key,
    fields.txnid,
    fields.amount,
    fields.productinfo,
    fields.firstname,
    fields.email,
    fields.udf1 || '',
    fields.udf2 || '',
    fields.udf3 || '',
    fields.udf4 || '',
    fields.udf5 || '',
    '', '', '', '', '',
    salt,
  ];
  return sha512(values.join('|'));
}

export function verifyPayuResponseHash(fields, salt) {
  const values = [
    salt,
    fields.status || '',
    ...Array(5).fill(''),
    fields.udf5 || '',
    fields.udf4 || '',
    fields.udf3 || '',
    fields.udf2 || '',
    fields.udf1 || '',
    fields.email || '',
    fields.firstname || '',
    fields.productinfo || '',
    fields.amount || '',
    fields.txnid || '',
    fields.key || '',
  ];
  let expected = sha512(values.join('|'));
  if (fields.additionalCharges) expected = sha512(`${fields.additionalCharges}|${values.join('|')}`);

  const received = String(fields.hash || '').toLowerCase();
  if (!/^[a-f0-9]{128}$/.test(received)) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}

export async function createBookingCheckout(customer, data) {
  const currentCustomer = await User.findById(customer._id).select('name email phone');
  if (!currentCustomer) throw notFound('Customer not found');
  const booking = await bookingService.createBooking(customer._id, data, { paymentPending: true });

  if (booking.payment.amount === 0) {
    await sendConfirmationEmails(booking);
    return {
      walletOnly: true,
      bookingId: booking._id,
      amount: booking.payment.walletAmount,
      currency: 'INR',
    };
  }

  const txnid = `HA${crypto.randomBytes(10).toString('hex')}`;
  try {
    const { key, salt, actionUrl } = getPayuConfig();
    const fields = {
      key,
      txnid,
      amount: amountString(booking.payment.amount),
      productinfo: `Haango booking ${booking.bookingId}`,
      firstname: currentCustomer.name.trim().split(/\s+/)[0],
      email: currentCustomer.email,
      phone: currentCustomer.phone.replace(/\D/g, '').slice(-10),
      surl: getClientBookingUrl(booking.buddyProfileId),
      furl: getClientBookingUrl(booking.buddyProfileId),
      udf1: String(booking._id),
      udf2: booking.bookingId,
      udf3: String(booking.buddyProfileId),
      udf4: '',
      udf5: '',
    };

    booking.payment.txnId = txnid;
    await booking.save();

    return {
      actionUrl,
      fields: { ...fields, hash: createPayuRequestHash(fields, salt) },
      bookingId: booking._id,
      amount: booking.payment.amount,
      walletAmount: booking.payment.walletAmount,
      currency: 'INR',
    };
  } catch (error) {
    await bookingService.failPaymentBooking(booking._id, 'Payment checkout could not be initialized');
    throw error;
  }
}

async function sendConfirmationEmails(booking) {
  try {
    const [customer, buddy, buddyProfile, activity] = await Promise.all([
      User.findById(booking.customerId).select('name email'),
      User.findById(booking.buddyId).select('name email'),
      BuddyProfile.findById(booking.buddyProfileId).select('displayName'),
      Activity.findById(booking.activityId).select('name'),
    ]);
    await sendBookingConfirmationEmails({
      customer: customer?.toObject() || {},
      buddy: { ...(buddy?.toObject() || {}), name: buddyProfile?.displayName || buddy?.name || 'Buddy' },
      activity: activity?.name,
      booking,
    });
  } catch (emailError) {
    console.error('Booking confirmation email delivery failed:', emailError.message);
  }
}

export async function processPayuReturn(fields) {
  const { key, salt } = getPayuConfig();
  const txnid = String(fields.txnid || '');
  const booking = await findPayuReturnBooking(fields);
  if (!booking) return { booking: null, paid: false, verified: false };

  const validResponse = verifyPayuResponseHash(fields, salt)
    && fields.key === key
    && String(booking.payment.txnId || '') === txnid
    && String(fields.udf1 || '') === String(booking._id)
    && String(fields.udf2 || '') === booking.bookingId
    && String(fields.udf3 || '') === String(booking.buddyProfileId)
    && amountString(fields.amount) === amountString(booking.payment.amount);

  if (!validResponse) return { booking, paid: false, verified: false };

  const paid = String(fields.status || '').toLowerCase() === 'success';
  let newlyPaid = false;
  if (paid && !['PAID', 'REFUND_PENDING'].includes(booking.payment.status)) {
    booking.payment.gatewayPaymentId = String(fields.mihpayid || '');
    booking.payment.paidAt = new Date();
    if (booking.bookingStatus !== 'PAYMENT_PENDING' || booking.payment.expiresAt <= new Date()) {
      booking.payment.status = 'REFUND_PENDING';
      booking.payment.failureReason = 'Payment arrived after the booking reservation expired; refund review is required';
      booking.bookingStatus = 'CANCELLED';
      await bookingService.releasePaymentWallet(booking);
      booking.payment.walletStatus = booking.payment.walletAmount > 0 ? 'RELEASED' : 'NONE';
    } else {
      booking.payment.status = 'PAID';
      booking.payment.failureReason = '';
      booking.bookingStatus = 'CONFIRMED';
      if (booking.payment.walletStatus === 'HELD') booking.payment.walletStatus = 'CAPTURED';
      newlyPaid = true;
    }
    await booking.save();
  }

  if (newlyPaid) {
    await sendConfirmationEmails(booking);
  }

  if (!paid && !booking.isCleared && !['PAID', 'REFUND_PENDING'].includes(booking.payment.status)) {
    const failedBooking = await bookingService.failPaymentBooking(booking._id, 'PayU payment failed');
    return { booking: failedBooking || booking, paid: false, verified: true };
  }

  if (!paid && booking.payment.walletStatus === 'HELD') {
    await bookingService.releasePaymentWallet(booking);
    booking.payment.walletStatus = 'RELEASED';
    await booking.save();
  }

  return { booking, paid: booking.payment.status === 'PAID', verified: true };
}

export function getClientBookingUrl(buddyProfileId = '') {
  const url = new URL(`${env.clientUrl.replace(/\/$/, '')}/booking`);
  if (buddyProfileId) url.searchParams.set('buddyId', String(buddyProfileId));
  return url.toString();
}

export async function findPayuReturnBooking(fields = {}) {
  const txnid = String(fields.txnid || '');
  if (txnid) {
    const booking = await Booking.findOne({ 'payment.txnId': txnid });
    if (booking) return booking;
  }

  const bookingId = String(fields.udf1 || '');
  if (!/^[a-f\d]{24}$/i.test(bookingId)) return null;
  return Booking.findById(bookingId);
}
import Message from '../models/Message.js';
import Booking from '../models/Booking.js';
import BlockedUser from '../models/BlockedUser.js';
import { notFound, forbidden, badRequest } from '../utils/errors.js';

function sanitizeMessage(text) {
  let sanitized = String(text || '').trim();
  sanitized = sanitized
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[contact details removed]')
    .replace(/(?:\+?\d[\d\s().-]{8,}\d)/g, '[contact details removed]')
    .replace(/\b(?:upi|gpay|google pay|phonepe|paytm)\s*[:\-]?\s*[\w.-]+@[\w.-]+\b/gi, '[contact details removed]')
    .replace(/\b\d{6}\b/g, '[address details removed]')
    .replace(/\b(?:address|home|house|flat|apartment|street|road|lane|near|pin code|pincode)\b[^.!?\n]{0,100}/gi, '[address details removed]');

  return sanitized.trim();
}

function assertPaidBooking(booking) {
  if (booking.paymentStatus !== 'PAID') {
    throw forbidden('Messaging unlocks after the booking payment is completed');
  }
}

async function assertNotBlocked(userId, otherUserId) {
  const blocked = await BlockedUser.exists({
    $or: [
      { userId, blockedUserId: otherUserId },
      { userId: otherUserId, blockedUserId: userId },
    ],
  });
  if (blocked) throw forbidden('Messaging is blocked between these users');
}

export async function getConversationMessages(bookingId, userId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound('Booking not found');

  if (String(booking.customerId) !== String(userId) && String(booking.buddyId) !== String(userId)) {
    throw forbidden('Not part of this conversation');
  }
  assertPaidBooking(booking);
  const otherUserId = String(booking.customerId) === String(userId) ? booking.buddyId : booking.customerId;
  await assertNotBlocked(userId, otherUserId);

  return Message.find({ bookingId }).sort({ createdAt: 1 });
}

export async function sendMessage(bookingId, senderId, text) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound('Booking not found');

  let receiverId;
  if (String(booking.customerId) === String(senderId)) {
    receiverId = booking.buddyId;
  } else if (String(booking.buddyId) === String(senderId)) {
    receiverId = booking.customerId;
  } else {
    throw forbidden('Not part of this conversation');
  }

  assertPaidBooking(booking);
  await assertNotBlocked(senderId, receiverId);
  const sanitizedMessage = sanitizeMessage(text);
  if (!sanitizedMessage) throw badRequest('Message contains no allowed content', 'EMPTY_MESSAGE');

  const conversationId = `conv_${bookingId}`;
  const message = await Message.create({
    conversationId,
    bookingId,
    senderId,
    receiverId,
    message: sanitizedMessage,
  });

  return message;
}

export async function markMessageAsRead(messageId, userId) {
  const message = await Message.findById(messageId);
  if (!message) throw notFound('Message not found');

  if (String(message.receiverId) !== String(userId)) {
    throw forbidden('Not your message');
  }

  message.isRead = true;
  await message.save();
  return message;
}

export async function getConversations(userId) {
  const bookings = await Booking.find({
    $or: [{ customerId: userId }, { buddyId: userId }],
    paymentStatus: 'PAID',
  })
    .populate('customerId', 'name profileImage')
    .populate('buddyId', 'name profileImage')
    .populate('buddyProfileId', 'displayName profileImages')
    .sort({ updatedAt: -1 });

  const conversations = [];
  for (const booking of bookings) {
    const lastMessage = await Message.findOne({ bookingId: booking._id }).sort({ createdAt: -1 });
    conversations.push({
      bookingId: booking._id,
      id: String(booking._id),
      otherUser: String(booking.customerId?._id || booking.customerId) === String(userId)
        ? { id: booking.buddyId?._id, name: booking.buddyProfileId?.displayName || booking.buddyId?.name || 'Buddy', image: booking.buddyProfileId?.profileImages?.[0] || booking.buddyId?.profileImage || '' }
        : { id: booking.customerId?._id, name: booking.customerId?.name || 'Customer', image: booking.customerId?.profileImage || '' },
      bookingContext: `${booking.activitySlug} · ${booking.date.toDateString()}`,
      lastMessage: lastMessage?.message || '',
      lastTime: lastMessage?.createdAt || booking.updatedAt,
      isOtherUserOnline: false,
    });
  }

  return conversations;
}

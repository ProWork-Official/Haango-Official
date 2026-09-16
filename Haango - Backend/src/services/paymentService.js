import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../config/environment.js';
import Booking from '../models/Booking.js';
import { badRequest, notFound } from '../utils/errors.js';
import { recordAdminAction } from './adminAuditService.js';

export function isRazorpayConfigured() {
  return !!(env.razorpayKeyId && env.razorpayKeySecret);
}

function getRazorpayClient() {
  if (!isRazorpayConfigured()) {
    throw badRequest(
      'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env',
      'PAYMENT_NOT_CONFIGURED'
    );
  }

  return new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret });
}

export async function createOrder(booking) {
  const razorpay = getRazorpayClient();
  if (booking.paymentStatus === 'PAID') {
    throw badRequest('Booking has already been paid', 'BOOKING_ALREADY_PAID');
  }
  const order = await razorpay.orders.create({
    amount: Math.round(booking.totalAmount * 100),
    currency: 'INR',
    receipt: booking.bookingId,
    notes: { bookingId: String(booking._id) },
  });
  booking.razorpayOrderId = order.id;
  await booking.save();
  return { ...order, keyId: env.razorpayKeyId };
}

export async function createExtensionOrder(booking, hours) {
    const razorpay = getRazorpayClient();
    if (booking.paymentStatus !== 'PAID' || booking.bookingStatus !== 'ONGOING') throw badRequest('Only an active paid meeting can be extended', 'INVALID_STATUS');
    if (!Number.isInteger(hours) || hours < 1 || hours > 8) throw badRequest('Extension must be 1 to 8 hours', 'INVALID_DURATION');
    const [h, m] = String(booking.startTime).split(':').map(Number);
    const scheduledEnd = new Date(booking.date);
    scheduledEnd.setHours(h || 0, m || 0, 0, 0);
    scheduledEnd.setTime(scheduledEnd.getTime() + booking.duration * 60 * 60 * 1000);
    if (Date.now() < scheduledEnd.getTime()) throw badRequest('Extension is available after the original meeting end', 'EXTENSION_TOO_EARLY');
    const amount = Math.round(booking.buddyRate * hours * (1 + env.platformFeePercentage / 100));
    const order = await razorpay.orders.create({ amount: amount * 100, currency: 'INR', receipt: `${booking.bookingId}-extension-${Date.now()}`, notes: { bookingId: String(booking._id), extensionHours: String(hours) } });
    booking.extensionHours = hours; booking.extensionAmount = amount; booking.extensionPaymentStatus = 'PENDING'; booking.extensionOrderId = order.id;
    await booking.save();
    return { ...order, keyId: env.razorpayKeyId };
}

export async function verifyExtensionPayment(data, customerId) {
    const razorpay = getRazorpayClient();
    const booking = await Booking.findById(data.bookingId);
    if (!booking || String(booking.customerId) !== String(customerId)) throw notFound('Booking not found');
    if (booking.extensionOrderId !== data.razorpay_order_id) throw badRequest('Payment order does not match extension', 'PAYMENT_ORDER_MISMATCH');
    const expected = crypto.createHmac('sha256', env.razorpayKeySecret).update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`).digest('hex');
    if (expected !== data.razorpay_signature) throw badRequest('Payment verification failed', 'PAYMENT_VERIFICATION_FAILED');
    const payment = await razorpay.payments.fetch(data.razorpay_payment_id);
    if (payment.status !== 'captured') throw badRequest('Payment has not been captured', 'PAYMENT_NOT_CAPTURED');
    booking.extensionPaymentStatus = 'PAID'; booking.extensionPaymentId = data.razorpay_payment_id; booking.extensionSignature = data.razorpay_signature;
    booking.duration += booking.extensionHours;
    await booking.save();
    return booking;
}

export async function verifyPayment(paymentData, customerId) {
  const razorpay = getRazorpayClient();
  const { bookingId, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = paymentData;
  const booking = await Booking.findById(bookingId);
  if (!booking || String(booking.customerId) !== String(customerId)) throw notFound('Booking not found');
  if (!booking.razorpayOrderId || booking.razorpayOrderId !== orderId) {
    throw badRequest('Payment order does not match booking', 'PAYMENT_ORDER_MISMATCH');
  }

  const expectedSignature = crypto.createHmac('sha256', env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  if (expectedSignature !== signature) {
    throw badRequest('Payment verification failed', 'PAYMENT_VERIFICATION_FAILED');
  }

  const payment = await razorpay.payments.fetch(paymentId);
  if (payment.order_id !== orderId || payment.status !== 'captured') {
    throw badRequest('Payment has not been captured', 'PAYMENT_NOT_CAPTURED');
  }

  booking.paymentStatus = 'PAID';
  booking.bookingStatus = 'CONFIRMED';
  booking.razorpayPaymentId = paymentId;
  booking.razorpaySignature = signature;
  await booking.save();
  return booking;
}

export async function refundPayment(bookingId, customerId, actor, request) {
  const razorpay = getRazorpayClient();
  const booking = await Booking.findById(bookingId);
  if (!booking || String(booking.customerId) !== String(customerId)) throw notFound('Booking not found');
  if (booking.paymentStatus === 'REFUNDED') {
    return booking;
  }
  if (booking.paymentStatus !== 'PAID' || !booking.razorpayPaymentId) {
    throw badRequest('This booking has no captured Razorpay payment to refund', 'PAYMENT_NOT_REFUNDABLE');
  }
  if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.bookingStatus)) {
    throw badRequest('Booking cannot be refunded', 'INVALID_STATUS');
  }

  await razorpay.payments.refund(booking.razorpayPaymentId, {
    amount: Math.round(booking.totalAmount * 100),
  });
  booking.paymentStatus = 'REFUNDED';
  booking.bookingStatus = 'CANCELLED';
  if (booking.meeting) booking.meeting.locations = [];
  await booking.save();
  await recordAdminAction({ actor, request, action: 'REFUND', targetType: 'Booking', targetId: booking._id, metadata: { amount: booking.totalAmount, paymentStatus: 'REFUNDED' } });
  return booking;
}

export async function handleWebhook(body, signature, rawBody) {
  getRazorpayClient();
  const expectedSignature = crypto.createHmac('sha256', env.razorpayKeySecret)
    .update(rawBody || JSON.stringify(body))
    .digest('hex');
  if (expectedSignature !== signature) throw badRequest('Invalid webhook signature', 'INVALID_WEBHOOK_SIGNATURE');

  const event = body?.event;
  const paymentEntity = body?.payload?.payment?.entity;
  const orderId = paymentEntity?.order_id;
  if (!orderId) return;

  const booking = await Booking.findOne({ razorpayOrderId: orderId });
  if (!booking) return;

  if (event === 'payment.captured') {
    booking.paymentStatus = 'PAID';
    booking.bookingStatus = 'CONFIRMED';
    booking.razorpayPaymentId = paymentEntity.id || booking.razorpayPaymentId;
  } else if (event === 'payment.failed') {
    booking.paymentStatus = 'FAILED';
  } else if (event === 'refund.processed') {
    booking.paymentStatus = 'REFUNDED';
  }

  await booking.save();
}

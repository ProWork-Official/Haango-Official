import * as paymentService from '../services/paymentService.js';
import Booking from '../models/Booking.js';
import { success } from '../utils/response.js';
import { notFound } from '../utils/errors.js';

export async function createOrder(req, res, next) {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) throw notFound('Booking not found');
    if (String(booking.customerId) !== String(req.user._id)) {
      throw notFound('Booking not found');
    }
    const order = await paymentService.createOrder(booking);
    res.json(success(order));
  } catch (err) {
    next(err);
  }
}

export async function verifyPayment(req, res, next) {
  try {
    const booking = await paymentService.verifyPayment(req.body, req.user._id);
    res.json(success({ verified: true, booking }));
  } catch (err) {
    next(err);
  }
}

export async function refundPayment(req, res, next) {
  try {
    const booking = await paymentService.refundPayment(req.body.bookingId, req.user._id, req.user, req);
    res.json(success(booking));
  } catch (err) {
    next(err);
  }
}

export async function webhook(req, res, next) {
  try {
    await paymentService.handleWebhook(req.body, req.headers['x-razorpay-signature'], req.rawBody);
    res.json(success({ received: true }));
  } catch (err) {
    next(err);
  }
}
export async function createExtensionOrder(req, res, next) {
    try {
      const booking = await Booking.findById(req.body.bookingId);
      if (!booking || String(booking.customerId) !== String(req.user._id)) throw notFound('Booking not found');
      res.json(success(await paymentService.createExtensionOrder(booking, Number(req.body.hours))));
    } catch (err) { next(err); }
}
export async function verifyExtensionPayment(req, res, next) {
    try { res.json(success(await paymentService.verifyExtensionPayment(req.body, req.user._id))); } catch (err) { next(err); }
}

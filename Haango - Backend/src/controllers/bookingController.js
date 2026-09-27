import * as bookingService from '../services/bookingService.js';
import * as payuService from '../services/payuService.js';
import { success, paginated, buildPagination } from '../utils/response.js';

export async function createBooking(req, res, next) {
  try {
    const checkout = await payuService.createBookingCheckout(req.user, req.body);
    res.status(201).json(success(checkout));
  } catch (err) {
    next(err);
  }
}

export async function payuReturn(req, res) {
  const returnFields = { ...(req.query || {}), ...(req.body || {}) };
  let result;
  try {
    result = await payuService.processPayuReturn(returnFields);
  } catch (err) {
    console.error('PayU return processing failed:', err.message);
    result = {
      booking: await payuService.findPayuReturnBooking(returnFields).catch(() => null),
      paid: false,
      verified: false,
    };
  }

  const params = new URLSearchParams();
  const buddyId = result.booking?.buddyProfileId || returnFields.udf3 || returnFields.buddyId;
  if (/^[a-f\d]{24}$/i.test(String(buddyId || ''))) {
    params.set('buddyId', String(buddyId));
  }
  if (result.booking?._id) params.set('bookingId', String(result.booking._id));
  if (result.booking?.duration) params.set('duration', String(result.booking.duration));
  if (result.booking?.payment?.amount !== undefined) {
    params.set('paymentAmount', String(result.booking.payment.amount));
  }

  const payment = !result.verified
    ? 'failed'
    : result.booking?.payment.status === 'REFUND_PENDING'
      ? 'refund-pending'
      : result.paid ? 'success' : 'failed';
  params.set('payment', payment);
  res.redirect(303, `${payuService.getClientBookingUrl()}?${params.toString()}`);
}

export async function getMyBookings(req, res, next) {
  try {
    const bookings = await bookingService.getCustomerBookings(req.user._id, req.query.status);
    res.json(success(bookings));
  } catch (err) {
    next(err);
  }
}

export async function getBuddyBookings(req, res, next) {
  try {
    const bookings = await bookingService.getBuddyBookings(req.user._id, req.query.status);
    res.json(success(bookings));
  } catch (err) {
    next(err);
  }
}

export async function getBookingById(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.params.id, req.user._id, req.user.role);
    res.json(success(booking));
  } catch (err) {
    next(err);
  }
}

export async function cancelBooking(req, res, next) {
  try {
    const booking = await bookingService.cancelBooking(req.params.id, req.user._id, req.user.role);
    res.json(success(booking));
  } catch (err) {
    next(err);
  }
}

export async function clearPendingPaymentBooking(req, res, next) {
  try {
    await bookingService.clearPendingPaymentBooking(req.params.id, req.user._id);
    res.json(success({ cleared: true }));
  } catch (err) {
    next(err);
  }
}

export async function acceptBooking(req, res, next) {
  try {
    const booking = await bookingService.updateBookingStatus(req.params.id, req.user._id, 'CONFIRMED');
    res.json(success(booking));
  } catch (err) {
    next(err);
  }
}

export async function rejectBooking(req, res, next) {
  try {
    const booking = await bookingService.updateBookingStatus(req.params.id, req.user._id, 'REJECTED');
    res.json(success(booking));
  } catch (err) {
    next(err);
  }
}

export async function startBooking(req, res, next) {
  try {
    res.json(success(await bookingService.issueMeetingOtp(req.params.id, req.user._id, 'START')));
  } catch (err) {
    next(err);
  }
}

export async function completeBooking(req, res, next) {
  try {
    res.json(success(await bookingService.issueMeetingOtp(req.params.id, req.user._id, 'END')));
  } catch (err) {
    next(err);
  }
}

export async function adminGetAllBookings(req, res, next) {
  try {
    const filters = {
      status: req.query.status,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };
    const { bookings, total } = await bookingService.getAllBookings(filters);
    res.json(paginated(bookings, buildPagination(filters.page, filters.limit, total)));
  } catch (err) {
    next(err);
  }
}
export async function issueMeetingOtp(req, res, next) {
    try { res.json(success(await bookingService.issueMeetingOtp(req.params.id, req.user._id, req.body.phase))); } catch (err) { next(err); }
}
export async function verifyMeetingOtp(req, res, next) {
    try { res.json(success(await bookingService.verifyMeetingOtp(req.params.id, req.user._id, req.body.phase, req.body.code))); } catch (err) { next(err); }
}
export async function requestCancellation(req, res, next) {
    try { res.status(201).json(success(await bookingService.requestCancellation(req.params.id, req.user._id, req.body.reason, req.body.details))); } catch (err) { next(err); }
}
export async function updateLocation(req, res, next) {
  try { res.json(success(await bookingService.updateParticipantLocation(req.params.id, req.user._id, req.body || {}, req))); } catch (err) { next(err); }
}
export async function getLocations(req, res, next) {
  try { res.json(success(await bookingService.getParticipantLocations(req.params.id, req.user._id, req))); } catch (err) { next(err); }
}
export async function stopLocation(req, res, next) {
  try { res.json(success(await bookingService.stopParticipantLocation(req.params.id, req.user._id, req))); } catch (err) { next(err); }
}

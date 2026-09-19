import * as bookingService from '../services/bookingService.js';
import { success, paginated, buildPagination } from '../utils/response.js';

export async function createBooking(req, res, next) {
  try {
    const booking = await bookingService.createBooking(req.user._id, req.body);
    res.status(201).json(success(booking));
  } catch (err) {
    next(err);
  }
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
export async function getCallRoom(req, res, next) {
    try { res.json(success(await bookingService.getCallRoom(req.params.id, req.user._id))); } catch (err) { next(err); }
}
export async function joinCall(req, res, next) {
  try { res.json(success(await bookingService.joinCall(req.params.id, req.user._id))); } catch (err) { next(err); }
}
export async function sendCallSignal(req, res, next) {
  try { res.json(success(await bookingService.sendCallSignal(req.params.id, req.user._id, req.body.type, req.body.payload || {}))); } catch (err) { next(err); }
}
export async function pollCallSignals(req, res, next) {
  try { res.json(success(await bookingService.pollCallSignals(req.params.id, req.user._id, req.query.after))); } catch (err) { next(err); }
}
export async function streamCallSignals(req, res, next) {
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
      await bookingService.subscribeCallSignals(req.params.id, req.user._id, res);
    } catch (err) { next(err); }
}
export async function leaveCall(req, res, next) {
  try { res.json(success(await bookingService.leaveCall(req.params.id, req.user._id))); } catch (err) { next(err); }
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

import { Router } from 'express';
import * as bookingController from '../controllers/bookingController.js';
import { requireAuth, requireBookingUser, requireBuddy, requireAdmin } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validate.js';
import { createBookingValidator } from '../validators/index.js';
import rateLimit from 'express-rate-limit';

const router = Router();
const locationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Location updates are temporarily limited. Try again shortly.', errorCode: 'LOCATION_RATE_LIMIT' },
});

router.post('/', requireAuth, requireBookingUser, createBookingValidator, handleValidationErrors, bookingController.createBooking);
router.get('/my-bookings', requireAuth, requireBookingUser, bookingController.getMyBookings);
router.get('/buddy', requireAuth, requireBuddy, bookingController.getBuddyBookings);
router.get('/admin/all', requireAuth, requireAdmin, bookingController.adminGetAllBookings);
router.get('/:id', requireAuth, bookingController.getBookingById);
router.patch('/:id/cancel', requireAuth, bookingController.cancelBooking);
router.post('/:id/cancellation-request', requireAuth, requireBookingUser, bookingController.requestCancellation);
router.post('/:id/meeting/otp', requireAuth, requireBookingUser, bookingController.issueMeetingOtp);
router.post('/:id/meeting/verify', requireAuth, requireBookingUser, bookingController.verifyMeetingOtp);
router.get('/:id/call-status', requireAuth, requireBookingUser, bookingController.getCallStatus);
router.post('/:id/call-signal', requireAuth, requireBookingUser, bookingController.sendCallSignal);
router.get('/:id/call-signals', requireAuth, requireBookingUser, bookingController.getCallSignals);
router.get('/:id/call-signals/stream', requireAuth, requireBookingUser, bookingController.streamCallSignals);
router.get('/:id/locations', locationLimiter, requireAuth, requireBookingUser, bookingController.getLocations);
router.post('/:id/location', locationLimiter, requireAuth, requireBookingUser, bookingController.updateLocation);
router.delete('/:id/location', locationLimiter, requireAuth, requireBookingUser, bookingController.stopLocation);

router.patch('/:id/accept', requireAuth, requireBuddy, bookingController.acceptBooking);
router.patch('/:id/reject', requireAuth, requireBuddy, bookingController.rejectBooking);
router.patch('/:id/start', requireAuth, requireBuddy, bookingController.startBooking);
router.patch('/:id/complete', requireAuth, requireBuddy, bookingController.completeBooking);

export default router;

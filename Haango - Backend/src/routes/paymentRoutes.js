import { Router } from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { requireAuth, requireBookingUser } from '../middleware/auth.js';

const router = Router();

router.post('/create-order', requireAuth, requireBookingUser, paymentController.createOrder);
router.post('/verify', requireAuth, requireBookingUser, paymentController.verifyPayment);
router.post('/refund', requireAuth, requireBookingUser, paymentController.refundPayment);
router.post('/extension/create-order', requireAuth, requireBookingUser, paymentController.createExtensionOrder);
router.post('/extension/verify', requireAuth, requireBookingUser, paymentController.verifyExtensionPayment);
router.post('/webhook', paymentController.webhook);

export default router;

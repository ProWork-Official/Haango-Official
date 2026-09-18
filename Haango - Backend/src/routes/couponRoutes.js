import { Router } from 'express';
import * as couponController from '../controllers/couponController.js';
import { requireAuth, requireBookingUser } from '../middleware/auth.js';

const router = Router();
router.post('/validate', requireAuth, requireBookingUser, couponController.validate);

export default router;

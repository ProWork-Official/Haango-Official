import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validate.js';
import { signupValidator, loginValidator } from '../validators/authValidators.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts, try again later', errorCode: 'RATE_LIMIT' },
});

router.post('/signup/request-otp', authLimiter, signupValidator, handleValidationErrors, authController.sendSignupOtp);
router.post('/signup', authLimiter, signupValidator, handleValidationErrors, authController.signup);
router.post('/login', authLimiter, loginValidator, handleValidationErrors, authController.login);
router.post('/login/request-otp', authLimiter, authController.requestLoginCode);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.post('/password/reset/request', authLimiter, authController.requestResetOtp);
router.post('/password/reset', authLimiter, authController.resetPassword);
router.get('/me', requireAuth, authController.me);

export default router;

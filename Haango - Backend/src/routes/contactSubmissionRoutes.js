import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as contactSubmissionController from '../controllers/contactSubmissionController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

const contactSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many contact submissions, try again later', errorCode: 'RATE_LIMIT' },
});

router.post('/', contactSubmissionLimiter, optionalAuth, contactSubmissionController.createContactSubmission);

export default router;

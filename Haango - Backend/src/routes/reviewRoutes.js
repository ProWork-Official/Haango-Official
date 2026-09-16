import { Router } from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { requireAuth, requireBookingUser } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validate.js';
import { createReviewValidator, updateReviewValidator } from '../validators/index.js';

const router = Router();

router.post('/', requireAuth, requireBookingUser, createReviewValidator, handleValidationErrors, reviewController.createReview);
router.patch('/:id', requireAuth, requireBookingUser, updateReviewValidator, handleValidationErrors, reviewController.updateReview);
router.delete('/:id', requireAuth, requireBookingUser, reviewController.deleteReview);
router.get('/mine/:buddyId', requireAuth, requireBookingUser, reviewController.getMyReview);
router.get('/buddy/:buddyId', reviewController.getBuddyReviews);

export default router;

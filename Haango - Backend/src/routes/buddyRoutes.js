import { Router } from 'express';
import * as buddyController from '../controllers/buddyController.js';
import { requireAuth, requireBuddyOrAdmin } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validate.js';
import { buddyProfileValidator } from '../validators/index.js';

const router = Router();

router.get('/featured', buddyController.getFeaturedBuddies);
router.get('/', buddyController.getBuddies);
router.get('/profile/me', requireAuth, buddyController.getMyBuddyProfile);
router.post('/profile', requireAuth, buddyProfileValidator, handleValidationErrors, buddyController.createMyBuddyProfile);
router.patch('/profile/me', requireAuth, requireBuddyOrAdmin, buddyProfileValidator, handleValidationErrors, buddyController.updateMyBuddyProfile);
router.get('/:id', buddyController.getBuddyById);

export default router;

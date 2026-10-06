import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMyProfile, saveMyProfile, dismissPrompt, restorePrompt, getLiked, toggleLike, getMyReferrals, claimReferralReward } from '../controllers/profileController.js';

const router = Router();

router.get('/me', requireAuth, getMyProfile);
router.post('/me', requireAuth, saveMyProfile);
router.post('/dismiss-prompt', requireAuth, dismissPrompt);
router.post('/restore-prompt', requireAuth, restorePrompt);
router.get('/liked-buddies', requireAuth, getLiked);
router.post('/liked-buddies/:buddyId/toggle', requireAuth, toggleLike);
router.get('/referrals/me', requireAuth, getMyReferrals);
router.post('/referrals/:referredUserId/claim', requireAuth, claimReferralReward);

export default router;

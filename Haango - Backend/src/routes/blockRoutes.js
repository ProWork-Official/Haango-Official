import { Router } from 'express';
import * as blockController from '../controllers/blockController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', blockController.getBlockedUsers);
router.post('/', blockController.blockUser);
router.delete('/:userId', blockController.unblockUser);

export default router;

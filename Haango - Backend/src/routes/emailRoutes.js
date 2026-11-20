import { Router } from 'express';
import * as emailController from '../controllers/emailController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Public: the signed token identifies the address and authorizes this one action.
router.post('/unsubscribe', emailController.unsubscribe);
router.get('/preferences', requireAuth, emailController.getPreferences);
router.post('/resubscribe', requireAuth, emailController.resubscribe);

export default router;

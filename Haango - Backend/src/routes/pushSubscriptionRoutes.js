import { Router } from 'express';
import * as controller from '../controllers/pushSubscriptionController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/public-key', controller.getPublicKey);
router.post('/', requireAuth, controller.subscribe);
router.delete('/', requireAuth, controller.unsubscribe);

export default router;
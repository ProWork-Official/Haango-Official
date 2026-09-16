import { Router } from 'express';
import * as messageController from '../controllers/messageController.js';
import { requireAuth } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validate.js';
import { sendMessageValidator } from '../validators/index.js';

const router = Router();

router.get('/conversations', requireAuth, messageController.getConversations);
router.get('/:bookingId', requireAuth, messageController.getMessages);
router.post('/:bookingId', requireAuth, sendMessageValidator, handleValidationErrors, messageController.sendMessage);
router.patch('/:id/read', requireAuth, messageController.markAsRead);

export default router;

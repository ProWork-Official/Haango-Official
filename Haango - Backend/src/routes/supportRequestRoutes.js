import { Router } from 'express';
import * as supportRequestController from '../controllers/supportRequestController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validate.js';
import { body } from 'express-validator';

const router = Router();

const createSupportRequestValidator = [
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name is required.'),
  body('userType').optional().isIn(['USER', 'BUDDY']).withMessage('User type must be USER or BUDDY.'),
  body('problemDescription').trim().isLength({ min: 10, max: 4000 }).withMessage('Problem description is required.'),
];

router.post('/', requireAuth, createSupportRequestValidator, handleValidationErrors, supportRequestController.createSupportRequest);
router.get('/me', requireAuth, supportRequestController.getMySupportRequests);
router.get('/admin/all', requireAuth, requireAdmin, supportRequestController.adminGetSupportRequests);
router.patch('/admin/:id', requireAuth, requireAdmin, supportRequestController.adminResolveSupportRequest);

export default router;

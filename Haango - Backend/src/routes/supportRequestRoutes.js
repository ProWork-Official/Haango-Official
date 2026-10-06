import { Router } from 'express';
import * as supportRequestController from '../controllers/supportRequestController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validate.js';
import { body, query } from 'express-validator';

const router = Router();

const createSupportRequestValidator = [
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name is required.'),
  body('userType').optional().isIn(['USER', 'BUDDY']).withMessage('User type must be USER or BUDDY.'),
  body('problemDescription').trim().isLength({ min: 10, max: 4000 }).withMessage('Problem description is required.'),
];

router.post('/', requireAuth, createSupportRequestValidator, handleValidationErrors, supportRequestController.createSupportRequest);
router.get('/me', requireAuth, supportRequestController.getMySupportRequests);
router.get('/admin/stats', requireAuth, requireAdmin, supportRequestController.adminGetSupportRequestStats);
router.get('/admin/all', requireAuth, requireAdmin, [
  query('status').optional().isIn(['PENDING', 'IN_REVIEW', 'RESOLVED']).withMessage('Invalid support status.'),
  query('raisedToday').optional().isBoolean().withMessage('raisedToday must be a boolean.'),
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search must be 120 characters or fewer.'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.'),
], handleValidationErrors, supportRequestController.adminGetSupportRequests);
router.patch('/admin/:id', requireAuth, requireAdmin, supportRequestController.adminResolveSupportRequest);

export default router;

import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validate.js';
import { createReportValidator } from '../validators/index.js';

const router = Router();

router.post('/', requireAuth, createReportValidator, handleValidationErrors, reportController.createReport);

router.get('/admin/all', requireAuth, requireAdmin, reportController.adminGetReports);
router.patch('/admin/:id', requireAuth, requireAdmin, reportController.adminUpdateReport);

export default router;

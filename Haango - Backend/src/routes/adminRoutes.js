import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import * as couponController from '../controllers/couponController.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/users', adminController.getUsers);
router.get('/admin-users', adminController.getAdminUsers);
router.get('/buddies', adminController.getBuddies);
router.get('/featured-buddies', adminController.getFeaturedBuddyState);
router.patch('/buddies/:id/featured', adminController.setFeaturedBuddy);
router.patch('/buddies/:id', adminController.updateBuddy);
router.patch('/buddies/:id/verify', adminController.verifyBuddy);
router.patch('/buddies/:id/suspend', adminController.suspendBuddy);
router.patch('/buddies/:id/unsuspend', adminController.unsuspendBuddy);
router.patch('/users/:id/suspend', adminController.suspendUser);
router.patch('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/promote-to-admin', adminController.promoteToAdmin);
router.post('/users/:id/promote-to-super-admin', adminController.promoteToSuperAdmin);
router.post('/users/:id/demote-from-admin', adminController.demoteFromAdmin);
router.get('/reports', adminController.getReports);
router.patch('/reports/:id', adminController.updateReport);
router.get('/reviews', adminController.getReviews);
router.delete('/reviews/:id', adminController.deleteReview);
router.get('/cancellation-requests', adminController.getCancellationRequests);
router.patch('/cancellation-requests/:id', adminController.reviewCancellation);
router.get('/coupons', couponController.list);
router.post('/coupons', couponController.create);
router.delete('/coupons/:id', couponController.remove);

export default router;

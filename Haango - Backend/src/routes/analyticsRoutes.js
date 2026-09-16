import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Track page visits (can be done by any user)
router.post('/track', analyticsController.trackPageVisit);

// Admin only routes
router.use(requireAuth, requireAdmin);

router.get('/daily-traffic', analyticsController.getDailyTraffic);
router.get('/popular-pages', analyticsController.getPopularPages);
router.get('/user-analytics/:userId', analyticsController.getUserAnalytics);
router.get('/traffic-trend', analyticsController.getTrafficTrend);

export default router;

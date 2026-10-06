import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { optionalAuth, requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Track page visits (can be done by any user)
router.post('/track', optionalAuth, analyticsController.trackPageVisit);

// Admin only routes
router.use(requireAuth, requireAdmin);

router.get('/daily-traffic', analyticsController.getDailyTraffic);
router.get('/popular-pages', analyticsController.getPopularPages);
router.get('/user-analytics/:userId', analyticsController.getUserAnalytics);
router.get('/traffic-trend', analyticsController.getTrafficTrend);
router.get('/platform-activity', analyticsController.getPlatformActivity);

export default router;

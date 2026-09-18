import { Router } from 'express';
import * as bonusService from '../services/bonusService.js';
import { requireAuth, requireBuddy } from '../middleware/auth.js';
import { success } from '../utils/response.js';

const router = Router();
router.use(requireAuth, requireBuddy);
router.get('/early-starter', async (req, res, next) => {
  try {
    res.json(success(await bonusService.getBonusStatus(req.user._id)));
  } catch (error) {
    next(error);
  }
});
router.post('/early-starter/claim', async (req, res, next) => {
  try {
    res.json(success(await bonusService.claimEarlyStarterBonus(req.user._id)));
  } catch (error) {
    next(error);
  }
});

export default router;

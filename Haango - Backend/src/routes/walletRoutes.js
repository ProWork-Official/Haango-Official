import { Router } from 'express';
import * as walletController from '../controllers/walletController.js';
import { requireAuth, requireBuddy } from '../middleware/auth.js';

const router = Router();

router.post('/webhook', walletController.payoutWebhook);
router.use(requireAuth, requireBuddy);
router.get('/', walletController.getWallet);
router.put('/payout-details', walletController.savePayoutDetails);
router.post('/withdrawals', walletController.requestWithdrawal);

export default router;

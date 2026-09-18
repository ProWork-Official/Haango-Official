import { Router } from 'express';
import * as walletController from '../controllers/customerWalletController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.get('/', requireAuth, walletController.getWallet);

export default router;

import * as walletService from '../services/customerWalletService.js';
import { success } from '../utils/response.js';

export async function getWallet(req, res, next) {
  try {
    res.json(success(await walletService.getCustomerWallet(req.user._id)));
  } catch (error) {
    next(error);
  }
}

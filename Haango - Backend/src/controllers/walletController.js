import * as walletService from '../services/walletService.js';
import { success } from '../utils/response.js';

export async function getWallet(req, res, next) {
  try {
    const period = ['month', '3m', '6m', '1y'].includes(req.query.period) ? req.query.period : 'month';
    res.json(success(await walletService.getWalletSummary(req.user._id, period)));
  } catch (err) {
    next(err);
  }
}

export async function savePayoutDetails(req, res, next) {
  try {
    res.json(success(await walletService.savePayoutDetails(req.user._id, req.body || {})));
  } catch (err) {
    next(err);
  }
}

export async function requestWithdrawal(req, res, next) {
  try {
    res.status(201).json(success(await walletService.requestWithdrawal(req.user._id, req.body?.amount)));
  } catch (err) {
    next(err);
  }
}

export async function adminGetWithdrawals(req, res, next) {
  try {
    res.json(success(await walletService.getAllWithdrawals({
      status: req.query.status,
      limit: req.query.limit,
    })));
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateWithdrawal(req, res, next) {
  try {
    const { status, adminNote, transactionReference } = req.body || {};
    res.json(success(await walletService.updateWithdrawal(
      req.params.id,
      status,
      adminNote,
      transactionReference,
      req.user,
      req,
    )));
  } catch (err) {
    next(err);
  }
}

export async function payoutWebhook(req, res, next) {
  try {
    await walletService.handlePayoutWebhook(
      req.body,
      req.headers['x-razorpay-signature'],
      req.rawBody,
    );
    res.json(success({ received: true }));
  } catch (err) {
    next(err);
  }
}

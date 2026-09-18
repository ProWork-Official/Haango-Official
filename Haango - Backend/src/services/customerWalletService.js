import CustomerWallet from '../models/CustomerWallet.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { badRequest } from '../utils/errors.js';

export async function ensureCustomerWallet(userId) {
  return CustomerWallet.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, balance: 0 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function getCustomerWallet(userId) {
  const wallet = await ensureCustomerWallet(userId);
  const transactions = await WalletTransaction.find({ userId }).sort({ createdAt: -1 }).limit(30);
  return { balance: wallet.balance, transactions };
}

export async function creditWallet(userId, amount, reason, referenceId, details = {}) {
  const numericAmount = Math.round(Number(amount));
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw badRequest('Wallet credit must be positive', 'INVALID_WALLET_CREDIT');

  try {
    const transaction = await WalletTransaction.create({
      userId,
      type: 'CREDIT',
      reason,
      amount: numericAmount,
      referenceId,
      bookingId: details.bookingId || null,
      description: details.description || '',
    });
    await CustomerWallet.findOneAndUpdate({ userId }, { $inc: { balance: numericAmount } }, { upsert: true, setDefaultsOnInsert: true });
    return transaction;
  } catch (error) {
    if (error?.code === 11000) return WalletTransaction.findOne({ referenceId });
    throw error;
  }
}

export async function debitWallet(userId, amount, reason, referenceId, details = {}) {
  const numericAmount = Math.round(Number(amount));
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw badRequest('Wallet debit must be positive', 'INVALID_WALLET_DEBIT');

  const existingTransaction = await WalletTransaction.findOne({ referenceId });
  if (existingTransaction) return existingTransaction;

  const wallet = await CustomerWallet.findOneAndUpdate(
    { userId, balance: { $gte: numericAmount } },
    { $inc: { balance: -numericAmount } },
    { new: true }
  );
  if (!wallet) throw badRequest('Insufficient wallet balance', 'INSUFFICIENT_WALLET_BALANCE');

  try {
    return await WalletTransaction.create({
      userId,
      type: 'DEBIT',
      reason,
      amount: numericAmount,
      referenceId,
      bookingId: details.bookingId || null,
      description: details.description || '',
    });
  } catch (error) {
    await CustomerWallet.updateOne({ userId }, { $inc: { balance: numericAmount } });
    if (error?.code === 11000) return WalletTransaction.findOne({ referenceId });
    throw error;
  }
}

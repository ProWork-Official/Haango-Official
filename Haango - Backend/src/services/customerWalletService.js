import mongoose from 'mongoose';
import CustomerWallet from '../models/CustomerWallet.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { badRequest } from '../utils/errors.js';

export async function ensureCustomerWallet(userId, session = null) {
  return CustomerWallet.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, balance: 0 } },
    { upsert: true, new: true, setDefaultsOnInsert: true, ...(session ? { session } : {}) }
  );
}

export function calculateWalletAdjustment(currentBalance, adjustment) {
  const balance = Number(currentBalance);
  const amount = Number(adjustment);
  if (!Number.isFinite(balance) || balance < 0 || !Number.isSafeInteger(amount)) {
    throw badRequest('Enter a valid whole-rupee wallet adjustment', 'INVALID_WALLET_ADJUSTMENT');
  }

  const updatedBalance = balance + amount;
  if (!Number.isFinite(updatedBalance)) {
    throw badRequest('Wallet balance exceeds the supported limit', 'INVALID_WALLET_ADJUSTMENT');
  }
  if (updatedBalance < 0) {
    throw badRequest('Wallet adjustment cannot make the balance negative', 'INSUFFICIENT_WALLET_BALANCE');
  }

  return updatedBalance;
}

export async function adjustWallet(userId, adjustment, referenceId, details = {}) {
  const amount = Number(adjustment);
  if (!Number.isSafeInteger(amount)) {
    throw badRequest('Enter a valid whole-rupee wallet adjustment', 'INVALID_WALLET_ADJUSTMENT');
  }
  if (amount === 0) return { balance: (await ensureCustomerWallet(userId)).balance };
  if (!/^[\w-]{1,180}$/.test(String(referenceId || ''))) {
    throw badRequest('A valid wallet adjustment reference is required', 'INVALID_WALLET_ADJUSTMENT_REFERENCE');
  }

  const type = amount > 0 ? 'CREDIT' : 'DEBIT';
  const transactionAmount = Math.abs(amount);
  const session = await mongoose.startSession();
  let balance;

  try {
    await session.withTransaction(async () => {
      const existing = await WalletTransaction.findOne({ referenceId }).session(session);
      if (existing) {
        if (
          String(existing.userId) !== String(userId)
          || existing.type !== type
          || existing.amount !== transactionAmount
        ) {
          throw badRequest('Wallet adjustment reference was already used', 'IDEMPOTENCY_KEY_REUSED');
        }
        balance = (await ensureCustomerWallet(userId, session)).balance;
        return;
      }

      const currentWallet = await ensureCustomerWallet(userId, session);
      calculateWalletAdjustment(currentWallet.balance, amount);
      const filter = { userId };
      if (amount < 0) filter.balance = { $gte: transactionAmount };
      const wallet = await CustomerWallet.findOneAndUpdate(
        filter,
        { $inc: { balance: amount } },
        { new: true, session }
      );
      if (!wallet) {
        throw badRequest('Wallet adjustment cannot make the balance negative', 'INSUFFICIENT_WALLET_BALANCE');
      }

      await WalletTransaction.create([{
        userId,
        type,
        reason: 'ADMIN_ADJUSTMENT',
        amount: transactionAmount,
        referenceId,
        description: details.description || 'Wallet adjustment by admin',
      }], { session });
      balance = wallet.balance;
    });

    return { balance };
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await WalletTransaction.findOne({ referenceId });
      if (existing) {
        if (
          String(existing.userId) !== String(userId)
          || existing.type !== type
          || existing.amount !== transactionAmount
        ) {
          throw badRequest('Wallet adjustment reference was already used', 'IDEMPOTENCY_KEY_REUSED');
        }
        const wallet = await CustomerWallet.findOne({ userId }).select('balance').lean();
        return { balance: wallet?.balance || 0 };
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }
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

export async function reserveBookingWallet(userId, bookingId, amount) {
  const numericAmount = Number(amount);
  if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0) {
    throw badRequest('Booking wallet amount must be a positive whole rupee amount', 'INVALID_BOOKING_WALLET_AMOUNT');
  }

  const referenceId = `booking-wallet-${bookingId}`;
  const session = await mongoose.startSession();
  let balance;
  try {
    await session.withTransaction(async () => {
      const existing = await WalletTransaction.findOne({ referenceId }).session(session);
      if (existing) {
        if (String(existing.userId) !== String(userId) || existing.type !== 'DEBIT' || existing.reason !== 'BOOKING_PAYMENT' || existing.amount !== numericAmount) {
          throw badRequest('Booking wallet reservation reference was already used', 'IDEMPOTENCY_KEY_REUSED');
        }
        balance = (await ensureCustomerWallet(userId, session)).balance;
        return;
      }

      const wallet = await CustomerWallet.findOneAndUpdate(
        { userId, balance: { $gte: numericAmount } },
        { $inc: { balance: -numericAmount } },
        { new: true, session },
      );
      if (!wallet) throw badRequest('Insufficient wallet balance', 'INSUFFICIENT_WALLET_BALANCE');

      await WalletTransaction.create([{
        userId,
        type: 'DEBIT',
        reason: 'BOOKING_PAYMENT',
        amount: numericAmount,
        bookingId,
        referenceId,
        description: 'Wallet funds reserved for booking payment',
      }], { session });
      balance = wallet.balance;
    });
    return { balance };
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await WalletTransaction.findOne({ referenceId });
      if (existing && String(existing.userId) === String(userId) && existing.type === 'DEBIT' && existing.reason === 'BOOKING_PAYMENT' && existing.amount === numericAmount) {
        const wallet = await CustomerWallet.findOne({ userId }).select('balance').lean();
        return { balance: wallet?.balance || 0 };
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function releaseBookingWallet(userId, bookingId, amount) {
  const numericAmount = Number(amount);
  if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0) {
    return { released: false };
  }

  const debitReferenceId = `booking-wallet-${bookingId}`;
  const refundReferenceId = `booking-wallet-refund-${bookingId}`;
  const session = await mongoose.startSession();
  let balance;
  let released = false;
  try {
    await session.withTransaction(async () => {
      const debit = await WalletTransaction.findOne({ referenceId: debitReferenceId }).session(session);
      if (!debit) return;
      if (String(debit.userId) !== String(userId) || debit.type !== 'DEBIT' || debit.reason !== 'BOOKING_PAYMENT' || debit.amount !== numericAmount) {
        throw badRequest('Booking wallet reservation does not match', 'INVALID_BOOKING_WALLET_RESERVATION');
      }

      const existingRefund = await WalletTransaction.findOne({ referenceId: refundReferenceId }).session(session);
      if (existingRefund) {
        if (String(existingRefund.userId) !== String(userId) || existingRefund.type !== 'CREDIT' || existingRefund.reason !== 'BOOKING_REFUND' || existingRefund.amount !== numericAmount) {
          throw badRequest('Booking wallet refund reference was already used', 'IDEMPOTENCY_KEY_REUSED');
        }
        balance = (await ensureCustomerWallet(userId, session)).balance;
        released = true;
        return;
      }

      const wallet = await CustomerWallet.findOneAndUpdate(
        { userId },
        { $inc: { balance: numericAmount } },
        { new: true, upsert: true, setDefaultsOnInsert: true, session },
      );
      await WalletTransaction.create([{
        userId,
        type: 'CREDIT',
        reason: 'BOOKING_REFUND',
        amount: numericAmount,
        bookingId,
        referenceId: refundReferenceId,
        description: 'Wallet reservation returned after unsuccessful booking payment',
      }], { session });
      balance = wallet.balance;
      released = true;
    });
    return { balance, released };
  } catch (error) {
    if (error?.code === 11000) {
      const existingRefund = await WalletTransaction.findOne({ referenceId: refundReferenceId });
      if (existingRefund && String(existingRefund.userId) === String(userId) && existingRefund.type === 'CREDIT' && existingRefund.reason === 'BOOKING_REFUND' && existingRefund.amount === numericAmount) {
        const wallet = await CustomerWallet.findOne({ userId }).select('balance').lean();
        return { balance: wallet?.balance || 0, released: true };
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

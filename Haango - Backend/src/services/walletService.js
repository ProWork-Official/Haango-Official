import Booking from '../models/Booking.js';
import Wallet from '../models/Wallet.js';
import Withdrawal from '../models/Withdrawal.js';
import WalletBonus from '../models/WalletBonus.js';
import BuddyProfile from '../models/BuddyProfile.js';
import User from '../models/User.js';
import BuddyWalletAdjustment from '../models/BuddyWalletAdjustment.js';
import { getBonusStatus, ensureEarlyStarterBonus } from './bonusService.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';

const MIN_WITHDRAWAL = 300;
const ACTIVE_WITHDRAWAL_STATUSES = ['PENDING', 'PROCESSING', 'PAID'];
const BANK_HOLIDAYS = new Set([
  '2025-01-26', '2025-02-12', '2025-02-13', '2025-02-14', '2025-02-15', '2025-02-16', '2025-02-17',
  '2025-03-31', '2025-04-10', '2025-05-01', '2025-06-06', '2025-08-15', '2025-08-16', '2025-08-27',
  '2025-09-05', '2025-09-17', '2025-10-02', '2025-11-15', '2025-12-25',
  '2026-01-26', '2026-02-11', '2026-02-12', '2026-02-13', '2026-02-14', '2026-02-15', '2026-02-16',
  '2026-03-20', '2026-04-03', '2026-04-14', '2026-05-01', '2026-06-06', '2026-08-15', '2026-08-27',
  '2026-09-17', '2026-10-02', '2026-11-15', '2026-12-25',
]);

export function computeBuddyPayoutBreakdown({ buddyRate, duration, amount = null }) {
  const baseAmount = Number(amount ?? ((Number(buddyRate || 0) * Number(duration || 0)) || 0));
  const buddyPayoutAmount = Math.round(baseAmount * 0.8);
  const platformShareAmount = Math.round(baseAmount * 0.2);

  return {
    buddyPayoutAmount,
    platformShareAmount,
    totalBookingValue: Math.round(baseAmount),
  };
}

export function calculateBuddyWalletTotals({ bookingEarnings = 0, bonuses = 0, adminCredits = 0, adminDebits = 0, activeWithdrawals = 0 }) {
  const totalEarned = Number(bookingEarnings) + Number(bonuses) + Number(adminCredits) - Number(adminDebits);
  const totalWithdrawn = Number(activeWithdrawals);
  return {
    totalEarned,
    totalWithdrawn,
    availableBalance: Math.max(0, totalEarned - totalWithdrawn),
  };
}

function isBusinessDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const dayOfWeek = day.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  return !BANK_HOLIDAYS.has(day.toISOString().slice(0, 10));
}

function getNextBusinessDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);

  do {
    next.setDate(next.getDate() + 1);
  } while (!isBusinessDay(next));

  return next;
}

export function resolvePayoutCycle(referenceDate = new Date()) {
  const base = new Date(referenceDate);
  if (Number.isNaN(base.getTime())) {
    return { settlementDate: new Date(), settlementWindow: 'T+2 business day', referenceDate: new Date() };
  }

  let settlementDate = new Date(base);
  settlementDate.setHours(0, 0, 0, 0);

  if (isBusinessDay(settlementDate) && (base.getHours() >= 21 || base.getHours() < 9)) {
    settlementDate = getNextBusinessDay(settlementDate);
  }

  settlementDate = getNextBusinessDay(settlementDate);
  settlementDate = getNextBusinessDay(settlementDate);

  return {
    settlementDate,
    settlementWindow: 'T+2 business day',
    referenceDate: base,
  };
}

export async function settleCompletedBookingPayout(booking) {
  if (!booking) return booking;
  if (String(booking.bookingStatus || '').toUpperCase() !== 'COMPLETED') return booking;
  if (booking.buddyPayoutAmount > 0 && booking.payoutStatus === 'PAID') return booking;

  const completionDate = booking.meeting?.endedAt || booking.updatedAt || new Date();
  const breakdown = computeBuddyPayoutBreakdown({
    buddyRate: booking.buddyRate,
    duration: booking.duration,
  });

  booking.buddyPayoutAmount = breakdown.buddyPayoutAmount;
  booking.platformShareAmount = breakdown.platformShareAmount;
  booking.payoutEligibleAt = resolvePayoutCycle(completionDate).settlementDate;
  booking.payoutStatus = 'READY';

  return booking;
}

function maskAccountNumber(accountNumber) {
  const value = String(accountNumber || '');
  return value.length > 4 ? `•••• ${value.slice(-4)}` : value;
}

function maskUpiId(upiId) {
  const value = String(upiId || '');
  const [name, domain] = value.split('@');
  return name && domain ? `${name.slice(0, 2)}•••@${domain}` : value;
}

function toSafeWallet(wallet) {
  if (!wallet) return null;
  return {
    id: wallet._id,
    payoutMethod: wallet.payoutMethod,
    accountHolderName: wallet.accountHolderName,
    bankName: wallet.bankName,
    ifscCode: wallet.ifscCode,
    upiId: wallet.upiId,
    destinationMasked: wallet.payoutMethod === 'UPI'
      ? maskUpiId(wallet.upiId)
      : maskAccountNumber(wallet.accountNumber),
    isVerified: wallet.isVerified,
  };
}

async function getWalletDocument(userId) {
  return Wallet.findOne({ userId }).select('+accountNumber');
}

function getPeriodStart(period = 'month') {
  const start = new Date();
  if (period === '3m') start.setMonth(start.getMonth() - 3);
  else if (period === '6m') start.setMonth(start.getMonth() - 6);
  else if (period === '1y') start.setFullYear(start.getFullYear() - 1);
  else start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

async function getEarnings(userId, period = 'month') {
  const periodStart = getPeriodStart(period);
  await ensureEarlyStarterBonus(userId);

  const [earningsResult, allTimeEarningsResult, withdrawalsResult, bonusResult, allTimeBonusResult, adjustmentResult, completionResult] = await Promise.all([
    Booking.aggregate([
      { $match: { buddyId: userId, bookingStatus: 'COMPLETED', updatedAt: { $gte: periodStart } } },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: { $multiply: [{ $multiply: ['$buddyRate', '$duration'] }, 0.8] } },
        },
      },
    ]),
    Booking.aggregate([
      { $match: { buddyId: userId, bookingStatus: 'COMPLETED' } },
      { $group: { _id: null, totalEarned: { $sum: { $multiply: [{ $multiply: ['$buddyRate', '$duration'] }, 0.8] } } } },
    ]),
    Withdrawal.aggregate([
      { $match: { userId, status: { $in: ACTIVE_WITHDRAWAL_STATUSES } } },
      { $group: { _id: null, totalWithdrawn: { $sum: '$amount' } } },
    ]),
    WalletBonus.aggregate([{ $match: { userId, createdAt: { $gte: periodStart } } }, { $group: { _id: null, totalBonus: { $sum: '$amount' } } }]),
    WalletBonus.aggregate([{ $match: { userId } }, { $group: { _id: null, totalBonus: { $sum: '$amount' } } }]),
    BuddyWalletAdjustment.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          credits: { $sum: { $cond: [{ $eq: ['$type', 'CREDIT'] }, '$amount', 0] } },
          debits: { $sum: { $cond: [{ $eq: ['$type', 'DEBIT'] }, '$amount', 0] } },
          periodCredits: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'CREDIT'] }, { $gte: ['$createdAt', periodStart] }] }, '$amount', 0] } },
          periodDebits: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'DEBIT'] }, { $gte: ['$createdAt', periodStart] }] }, '$amount', 0] } },
        },
      },
    ]),
    Booking.aggregate([
      { $match: { buddyId: userId, bookingStatus: { $in: ['COMPLETED', 'CANCELLED', 'REJECTED'] } } },
      { $group: { _id: null, completed: { $sum: { $cond: [{ $eq: ['$bookingStatus', 'COMPLETED'] }, 1, 0] } }, total: { $sum: 1 } } },
    ]),
  ]);

  const earnedThisPeriodFromBookings = earningsResult[0]?.totalEarned || 0;
  const earnedFromBookings = allTimeEarningsResult[0]?.totalEarned || 0;
  const periodBonus = bonusResult[0]?.totalBonus || 0;
  const totalBonus = allTimeBonusResult[0]?.totalBonus || 0;
  const adjustments = adjustmentResult[0] || {};
  const totalWithdrawn = withdrawalsResult[0]?.totalWithdrawn || 0;
  const walletTotals = calculateBuddyWalletTotals({
    bookingEarnings: earnedFromBookings,
    bonuses: totalBonus,
    adminCredits: adjustments.credits || 0,
    adminDebits: adjustments.debits || 0,
    activeWithdrawals: totalWithdrawn,
  });
  const completedMeetings = completionResult[0]?.completed || 0;
  const decidedBookings = completionResult[0]?.total || 0;
  return {
    totalEarned: walletTotals.totalEarned,
    earnedThisPeriod: earnedThisPeriodFromBookings + periodBonus + Number(adjustments.periodCredits || 0) - Number(adjustments.periodDebits || 0),
    totalWithdrawn: walletTotals.totalWithdrawn,
    availableBalance: walletTotals.availableBalance,
    completionRate: completedMeetings > 0 && decidedBookings > 0
      ? Math.round((completedMeetings / decidedBookings) * 100)
      : 0,
    period,
    periodStart,
  };
}

export async function getWalletSummary(userId, period = 'month') {
  const [wallet, earnings, withdrawals] = await Promise.all([
    getWalletDocument(userId),
    getEarnings(userId, period),
    Withdrawal.find({ userId }).sort({ createdAt: -1 }).limit(20),
  ]);
  const bonus = await getBonusStatus(userId);

  return {
    wallet: toSafeWallet(wallet),
    ...earnings,
    withdrawals,
    minimumWithdrawal: MIN_WITHDRAWAL,
    bonus,
  };
}

function serializeAdminPayoutWallet(wallet) {
  if (!wallet) return null;
  return {
    payoutMethod: wallet.payoutMethod,
    accountHolderName: wallet.accountHolderName,
    bankName: wallet.bankName,
    accountNumber: wallet.accountNumber,
    ifscCode: wallet.ifscCode,
    upiId: wallet.upiId,
    isVerified: wallet.isVerified,
    destinationMasked: wallet.payoutMethod === 'UPI'
      ? maskUpiId(wallet.upiId)
      : maskAccountNumber(wallet.accountNumber),
  };
}

export async function getAdminBuddyWallet(buddyProfileId) {
  const buddyProfile = await BuddyProfile.findById(buddyProfileId).select('userId');
  if (!buddyProfile) throw notFound('Buddy profile not found');
  const userId = buddyProfile.userId?._id || buddyProfile.userId;
  const user = await User.findById(userId).select('name email role');
  if (!user || user.role !== 'BUDDY') throw notFound('Buddy account not found');

  const [wallet, earnings, withdrawals, adjustments] = await Promise.all([
    getWalletDocument(userId),
    getEarnings(userId),
    Withdrawal.find({ userId }).sort({ createdAt: -1 }).limit(100).lean(),
    BuddyWalletAdjustment.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  return {
    user: { id: String(user._id), name: user.name, email: user.email },
    wallet: serializeAdminPayoutWallet(wallet),
    availableBalance: earnings.availableBalance,
    totalEarned: earnings.totalEarned,
    totalWithdrawn: earnings.totalWithdrawn,
    withdrawals,
    adjustments,
  };
}

export async function adjustBuddyWallet(buddyProfileId, amount, referenceId, adminId) {
  const buddyProfile = await BuddyProfile.findById(buddyProfileId).select('userId');
  if (!buddyProfile) throw notFound('Buddy profile not found');
  const userId = buddyProfile.userId?._id || buddyProfile.userId;
  const user = await User.findById(userId).select('_id role');
  if (!user || user.role !== 'BUDDY') throw notFound('Buddy account not found');

  const adjustment = Number(amount);
  if (!Number.isSafeInteger(adjustment) || adjustment === 0) {
    throw badRequest('Enter a non-zero whole-rupee wallet adjustment', 'INVALID_WALLET_ADJUSTMENT');
  }
  if (!/^[\w-]{1,100}$/.test(String(referenceId || ''))) {
    throw badRequest('A valid wallet adjustment reference is required', 'INVALID_WALLET_ADJUSTMENT_REFERENCE');
  }

  const existing = await BuddyWalletAdjustment.findOne({ referenceId });
  if (existing) {
    if (String(existing.userId) !== String(userId) || existing.amount !== Math.abs(adjustment)
      || existing.type !== (adjustment > 0 ? 'CREDIT' : 'DEBIT')) {
      throw badRequest('This wallet adjustment reference was already used', 'WALLET_ADJUSTMENT_REFERENCE_REUSED');
    }
    return getAdminBuddyWallet(buddyProfileId);
  }

  if (adjustment < 0) {
    const earnings = await getEarnings(userId);
    if (Math.abs(adjustment) > earnings.availableBalance) {
      throw badRequest('Debit exceeds the buddy’s available wallet balance', 'INSUFFICIENT_BUDDY_WALLET_BALANCE');
    }
  }

  try {
    await BuddyWalletAdjustment.create({
      userId,
      adminId,
      type: adjustment > 0 ? 'CREDIT' : 'DEBIT',
      amount: Math.abs(adjustment),
      description: 'Admin wallet adjustment',
      referenceId,
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const duplicate = await BuddyWalletAdjustment.findOne({ referenceId });
    if (!duplicate || String(duplicate.userId) !== String(userId) || duplicate.amount !== Math.abs(adjustment)
      || duplicate.type !== (adjustment > 0 ? 'CREDIT' : 'DEBIT')) {
      throw badRequest('This wallet adjustment reference was already used', 'WALLET_ADJUSTMENT_REFERENCE_REUSED');
    }
  }

  return getAdminBuddyWallet(buddyProfileId);
}

export async function savePayoutDetails(userId, data) {
  const payoutMethod = String(data.payoutMethod || '').toUpperCase();
  const accountHolderName = String(data.accountHolderName || '').trim();
  const bankName = String(data.bankName || '').trim();
  const accountNumber = String(data.accountNumber || '').replace(/\s/g, '');
  const ifscCode = String(data.ifscCode || '').trim().toUpperCase();
  const upiId = String(data.upiId || '').trim().toLowerCase();

  if (!['BANK', 'UPI'].includes(payoutMethod)) {
    throw badRequest('Choose a valid payout method', 'INVALID_PAYOUT_METHOD');
  }
  if (accountHolderName.length < 2) throw badRequest('Account holder name is required', 'INVALID_ACCOUNT_HOLDER');

  if (payoutMethod === 'BANK') {
    if (!bankName || !/^\d{6,30}$/.test(accountNumber)) {
      throw badRequest('Enter a valid bank name and account number', 'INVALID_BANK_DETAILS');
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      throw badRequest('Enter a valid IFSC code', 'INVALID_IFSC');
    }
  }

  if (payoutMethod === 'UPI' && !/^[\w.-]{2,}@[\w.-]{2,}$/.test(upiId)) {
    throw badRequest('Enter a valid UPI ID', 'INVALID_UPI_ID');
  }

  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    {
      userId,
      payoutMethod,
      accountHolderName,
      bankName: payoutMethod === 'BANK' ? bankName : '',
      accountNumber: payoutMethod === 'BANK' ? accountNumber : '',
      ifscCode: payoutMethod === 'BANK' ? ifscCode : '',
      upiId: payoutMethod === 'UPI' ? upiId : '',
      isVerified: false,
    },
    { upsert: true, new: true, runValidators: true }
  ).select('+accountNumber');

  return toSafeWallet(wallet);
}

export async function requestWithdrawal(userId, amount) {
  const wallet = await getWalletDocument(userId);
  if (!wallet?.payoutMethod) throw badRequest('Set up your payout details before withdrawing', 'PAYOUT_DETAILS_REQUIRED');

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < MIN_WITHDRAWAL) {
    throw badRequest(`Minimum withdrawal is ₹${MIN_WITHDRAWAL}`, 'MINIMUM_WITHDRAWAL');
  }

  const { availableBalance } = await getEarnings(userId);
  if (numericAmount > availableBalance) throw badRequest('Withdrawal amount exceeds your available balance', 'INSUFFICIENT_BALANCE');

  const destinationMasked = wallet.payoutMethod === 'UPI'
    ? maskUpiId(wallet.upiId)
    : maskAccountNumber(wallet.accountNumber);

  return Withdrawal.create({
    userId,
    amount: Math.round(numericAmount),
    payoutMethod: wallet.payoutMethod,
    destinationMasked,
  });
}

export async function getAllWithdrawals(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.userId) query.userId = filters.userId;
  return Withdrawal.find(query)
    .populate('userId', 'name email phone')
    .sort({ createdAt: -1 })
    .limit(Number(filters.limit) || 50);
}

export async function updateWithdrawal(withdrawalId, status, adminNote, transactionReference) {
  if (!['PROCESSING', 'PAID', 'REJECTED'].includes(status)) {
    throw badRequest('Invalid withdrawal status', 'INVALID_WITHDRAWAL_STATUS');
  }
  const withdrawal = await Withdrawal.findById(withdrawalId);
  if (!withdrawal) throw notFound('Withdrawal not found');
  if (withdrawal.status === status) return withdrawal;
  const allowedTransitions = {
    PENDING: ['PROCESSING', 'PAID', 'REJECTED'],
    PROCESSING: ['PAID', 'REJECTED'],
    PAID: [],
    REJECTED: [],
  };
  if (!allowedTransitions[withdrawal.status]?.includes(status)) {
    throw badRequest('This withdrawal status cannot be changed', 'WITHDRAWAL_INVALID_TRANSITION');
  }

  withdrawal.status = status;
  if (adminNote !== undefined) withdrawal.adminNote = String(adminNote).trim();
  if (transactionReference !== undefined) withdrawal.transactionReference = String(transactionReference).trim();
  if (status === 'REJECTED') {
    withdrawal.failureReason = String(adminNote || '').trim() || 'Withdrawal could not be completed. Please try again.';
  }
  await withdrawal.save();
  return withdrawal;
}

export function assertWalletOwner(walletUserId, userId) {
  if (String(walletUserId) !== String(userId)) throw forbidden('Not your wallet');
}

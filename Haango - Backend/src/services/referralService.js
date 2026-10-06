import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import CustomerWallet from '../models/CustomerWallet.js';
import User from '../models/User.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { badRequest, notFound } from '../utils/errors.js';

export const REFERRAL_REWARD = 100;
export const MINIMUM_REFERRAL_BOOKING = 500;

export function getReferralProgress(qualifyingBooking, claimTransaction = null) {
  if (claimTransaction) return 'CLAIMED';
  return qualifyingBooking ? 'ELIGIBLE_TO_CLAIM' : 'SIGNED_UP';
}

export function getReferralRewardReference(referredUserId) {
  return `referral-first-booking-${referredUserId}`;
}

export function isQualifyingReferralBooking(booking) {
  return Boolean(
    booking
    && booking.bookingStatus === 'COMPLETED'
    && Number(booking.totalAmount) >= MINIMUM_REFERRAL_BOOKING
  );
}

function completedBookingQuery(customerIds) {
  return {
    customerId: { $in: customerIds },
    bookingStatus: 'COMPLETED',
  };
}

async function getReferralOverview(userId) {
  const user = await User.findById(userId).select('name referralCode referredBy').populate('referredBy', 'name referralCode').lean();
  if (!user) throw notFound('User not found');

  const referredUsers = await User.find({ referredBy: userId })
    .select('name email role createdAt')
    .sort({ createdAt: -1 })
    .lean();
  const referredIds = referredUsers.map((referredUser) => referredUser._id);
  const [completedBookings, claimTransactions] = referredIds.length ? await Promise.all([
    Booking.find(completedBookingQuery(referredIds))
      .select('customerId totalAmount createdAt')
      .sort({ createdAt: 1 })
      .lean(),
    WalletTransaction.find({
      referenceId: { $in: referredIds.map(getReferralRewardReference) },
      reason: 'REFERRAL_REWARD',
      type: 'CREDIT',
    }).select('referenceId amount createdAt bookingId').lean(),
  ]) : [[], []];

  const firstCompletedBookingByUser = new Map();
  completedBookings.forEach((booking) => {
    const key = String(booking.customerId);
    if (!firstCompletedBookingByUser.has(key)) firstCompletedBookingByUser.set(key, booking);
  });
  const claimsByReference = new Map(claimTransactions.map((transaction) => [transaction.referenceId, transaction]));

  return {
    referralCode: user.referralCode || '',
    referredBy: user.referredBy ? {
      id: String(user.referredBy._id),
      name: user.referredBy.name,
      referralCode: user.referredBy.referralCode || '',
    } : null,
    rewardAmount: REFERRAL_REWARD,
    minimumBookingAmount: MINIMUM_REFERRAL_BOOKING,
    referrals: referredUsers.map((referredUser) => {
      const firstBooking = firstCompletedBookingByUser.get(String(referredUser._id)) || null;
      const qualifyingBooking = isQualifyingReferralBooking(firstBooking) ? firstBooking : null;
      const claim = claimsByReference.get(getReferralRewardReference(referredUser._id)) || null;
      return {
        id: String(referredUser._id),
        name: referredUser.name,
        email: referredUser.email,
        role: referredUser.role,
        signedUpAt: referredUser.createdAt,
        progress: getReferralProgress(qualifyingBooking, claim),
        qualifyingBookingAt: qualifyingBooking?.createdAt || null,
        qualifyingBookingAmount: qualifyingBooking?.totalAmount || null,
        claimedAt: claim?.createdAt || null,
        canClaim: Boolean(qualifyingBooking && !claim),
      };
    }),
  };
}

export async function getMyReferralOverview(userId) {
  return getReferralOverview(userId);
}

export async function getAdminReferralOverview(userId) {
  return getReferralOverview(userId);
}

export async function claimReferralReward(referrerId, referredUserId) {
  const session = await mongoose.startSession();
  const referenceId = getReferralRewardReference(referredUserId);
  let result;
  try {
    await session.withTransaction(async () => {
      const existingClaim = await WalletTransaction.findOne({ referenceId }).session(session);
      if (existingClaim) {
        if (String(existingClaim.userId) !== String(referrerId)
          || existingClaim.reason !== 'REFERRAL_REWARD'
          || existingClaim.type !== 'CREDIT'
          || existingClaim.amount !== REFERRAL_REWARD) {
          throw badRequest('Referral reward claim already exists with different details', 'REFERRAL_CLAIM_CONFLICT');
        }
        const wallet = await CustomerWallet.findOne({ userId: referrerId }).session(session);
        result = { claimed: true, alreadyClaimed: true, rewardAmount: REFERRAL_REWARD, walletBalance: wallet?.balance || 0 };
        return;
      }

      const referredUser = await User.findOne({ _id: referredUserId, referredBy: referrerId }).session(session);
      if (!referredUser) throw notFound('This user was not referred by your account');
      const firstCompletedBooking = await Booking.findOne(completedBookingQuery([referredUserId]))
        .sort({ createdAt: 1 })
        .session(session);
      if (!isQualifyingReferralBooking(firstCompletedBooking)) {
        throw badRequest(`Your referral reward unlocks after their first completed booking of ₹${MINIMUM_REFERRAL_BOOKING} or more.`, 'REFERRAL_NOT_ELIGIBLE');
      }

      const wallet = await CustomerWallet.findOneAndUpdate(
        { userId: referrerId },
        { $inc: { balance: REFERRAL_REWARD } },
        { new: true, upsert: true, setDefaultsOnInsert: true, session },
      );
      await WalletTransaction.create([{
        userId: referrerId,
        type: 'CREDIT',
        reason: 'REFERRAL_REWARD',
        amount: REFERRAL_REWARD,
        bookingId: firstCompletedBooking._id,
        referenceId,
        description: `Referral reward for ${referredUser.name}'s first completed booking`,
      }], { session });
      result = { claimed: true, alreadyClaimed: false, rewardAmount: REFERRAL_REWARD, walletBalance: wallet.balance };
    });
    return result;
  } catch (error) {
    if (error?.code === 11000) {
      const existingClaim = await WalletTransaction.findOne({ referenceId });
      if (existingClaim && String(existingClaim.userId) === String(referrerId)) {
        const wallet = await CustomerWallet.findOne({ userId: referrerId }).select('balance').lean();
        return { claimed: true, alreadyClaimed: true, rewardAmount: REFERRAL_REWARD, walletBalance: wallet?.balance || 0 };
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
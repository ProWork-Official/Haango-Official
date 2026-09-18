import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { creditWallet } from './customerWalletService.js';

const REFERRAL_REWARD = 100;
const MINIMUM_FIRST_BOOKING = 750;

export async function rewardReferrerForFirstBooking(booking) {
  if (!booking || Number(booking.totalAmount) < MINIMUM_FIRST_BOOKING) return null;
  const referredUser = await User.findById(booking.customerId).select('referredBy');
  if (!referredUser?.referredBy) return null;

  const previousPaidBooking = await Booking.exists({
    customerId: booking.customerId,
    paymentStatus: 'PAID',
    _id: { $ne: booking._id },
  });
  if (previousPaidBooking) return null;

  return creditWallet(
    referredUser.referredBy,
    REFERRAL_REWARD,
    'REFERRAL_REWARD',
    `referral-first-booking-${booking.customerId}`,
    { bookingId: booking._id, description: 'Referral reward for a first booking of ₹750 or more' }
  );
}

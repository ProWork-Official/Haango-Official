import { env } from '../config/environment.js';

export function calculateBookingPrice(buddyHourlyRate, duration) {
  if (duration < env.minBookingDuration || duration > env.maxBookingDuration) {
    throw new Error(`Duration must be between ${env.minBookingDuration} and ${env.maxBookingDuration} hours`);
  }

  const buddyFee = buddyHourlyRate * duration;
  const platformFee = Math.round((buddyFee * env.platformFeePercentage) / 100);
  const totalAmount = buddyFee + platformFee;
  const buddyWalletShare = Math.round(buddyFee * 0.8);
  const haangoCommission = Math.round(buddyFee * 0.2);

  return {
    buddyRate: buddyHourlyRate,
    buddyFee,
    platformFee,
    totalAmount,
    buddyWalletShare,
    haangoCommission,
  };
}

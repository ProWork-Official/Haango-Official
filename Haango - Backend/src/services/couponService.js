import Coupon from '../models/Coupon.js';
import CouponRedemption from '../models/CouponRedemption.js';
import { badRequest, notFound } from '../utils/errors.js';
import { creditWallet } from './customerWalletService.js';
import WalletBonus from '../models/WalletBonus.js';

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

export async function listCoupons() {
  return Coupon.find().sort({ createdAt: -1 });
}

export async function createCoupon(data, actor, request) {
  const code = normalizeCode(data.code);
  const amount = Number(data.amount);
  const type = String(data.type || '').toUpperCase();
  if (!/^[A-Z0-9_-]{3,50}$/.test(code)) throw badRequest('Coupon code must contain 3-50 letters, numbers, _ or -', 'INVALID_COUPON_CODE');
  if (!Number.isFinite(amount) || amount < 1) throw badRequest('Coupon amount must be at least ₹1', 'INVALID_COUPON_AMOUNT');
  if (!['BUDDY_SIGNUP', 'USER_SIGNUP', 'DISCOUNT'].includes(type)) throw badRequest('Coupon type must be BUDDY_SIGNUP, USER_SIGNUP, or DISCOUNT', 'INVALID_COUPON_TYPE');
  try {
    return await Coupon.create({ code, amount: Math.round(amount), type });
  } catch (error) {
    if (error?.code === 11000) throw badRequest('Coupon code already exists', 'COUPON_EXISTS');
    throw error;
  }
}

export async function deleteCoupon(id) {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw notFound('Coupon not found');
  return { deleted: true, id };
}

export async function findAvailableCoupon(code, user, context = 'BOOKING') {
  const coupon = await Coupon.findOne({ code: normalizeCode(code) });
  if (!coupon) throw badRequest('Invalid coupon code', 'INVALID_COUPON');
  const expectedType = context === 'BOOKING'
    ? 'DISCOUNT'
    : user.role === 'BUDDY' ? 'BUDDY_SIGNUP' : 'USER_SIGNUP';
  if (coupon.type !== expectedType) throw badRequest('This coupon is not valid for your account', 'INVALID_COUPON_TYPE');
  const redeemed = await CouponRedemption.exists({ couponId: coupon._id, userId: user._id });
  if (redeemed) throw badRequest('You have already used this coupon', 'COUPON_ALREADY_USED');
  return { coupon, context };
}

export async function validateBookingCoupon(code, user, totalAmount) {
  const { coupon } = await findAvailableCoupon(code, user, 'BOOKING');
  return { code: coupon.code, amount: Math.min(coupon.amount, Math.max(0, Number(totalAmount) || 0)), type: coupon.type };
}

export async function redeemCoupon(code, user, context, details = {}) {
  const existingCoupon = await Coupon.findOne({ code: normalizeCode(code) });
  if (existingCoupon) {
    const existingRedemption = await CouponRedemption.findOne({ couponId: existingCoupon._id, userId: user._id });
    if (existingRedemption) return { coupon: existingCoupon, redemption: existingRedemption, amount: existingRedemption.amount };
  }
  const { coupon } = await findAvailableCoupon(code, user, context);
  const amount = Math.min(coupon.amount, Math.max(0, Number(details.totalAmount) || coupon.amount));
  try {
    const redemption = await CouponRedemption.create({ couponId: coupon._id, userId: user._id, bookingId: details.bookingId || null, context, amount });
    if (context === 'SIGNUP') {
      if (user.role === 'BUDDY') {
        await WalletBonus.create({ userId: user._id, campaignId: `COUPON_${coupon._id}_${user._id}`, name: `Coupon ${coupon.code}`, amount, claimed: true, claimedAt: new Date() });
      } else {
        await creditWallet(user._id, amount, 'COUPON_CREDIT', `coupon-signup-${redemption._id}`, { description: `Signup coupon ${coupon.code}` });
      }
    }
    return { coupon, redemption, amount };
  } catch (error) {
    if (error?.code === 11000) throw badRequest('You have already used this coupon', 'COUPON_ALREADY_USED');
    throw error;
  }
}

export { normalizeCode };

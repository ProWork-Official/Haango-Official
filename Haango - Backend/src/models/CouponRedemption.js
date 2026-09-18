import mongoose from 'mongoose';

const couponRedemptionSchema = new mongoose.Schema(
  {
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    context: { type: String, enum: ['SIGNUP', 'BOOKING'], required: true },
    amount: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

couponRedemptionSchema.index({ couponId: 1, userId: 1 }, { unique: true });

export default mongoose.model('CouponRedemption', couponRedemptionSchema);

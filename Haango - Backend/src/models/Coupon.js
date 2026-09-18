import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    type: { type: String, enum: ['BUDDY_SIGNUP', 'USER_SIGNUP', 'DISCOUNT'], required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Coupon', couponSchema);

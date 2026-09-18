import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    reason: { type: String, enum: ['CANCELLATION_CREDIT', 'REFERRAL_REWARD', 'COUPON_CREDIT', 'BOOKING_PAYMENT', 'BOOKING_PAYMENT_REVERSAL'], required: true },
    amount: { type: Number, required: true, min: 1 },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
    referenceId: { type: String, required: true, unique: true, index: true },
    description: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('WalletTransaction', walletTransactionSchema);

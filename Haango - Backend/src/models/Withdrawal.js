import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'PAID', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    payoutMethod: { type: String, enum: ['BANK', 'UPI'], required: true },
    destinationMasked: { type: String, required: true },
    adminNote: { type: String, trim: true, maxlength: 500, default: '' },
    transactionReference: { type: String, trim: true, maxlength: 150, default: '' },
    razorpayXContactId: { type: String, trim: true, default: '' },
    razorpayXFundAccountId: { type: String, trim: true, default: '' },
    razorpayXPayoutId: { type: String, trim: true, default: '' },
    failureReason: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

withdrawalSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Withdrawal', withdrawalSchema);

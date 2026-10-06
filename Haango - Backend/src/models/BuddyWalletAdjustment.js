import mongoose from 'mongoose';

const buddyWalletAdjustmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    amount: { type: Number, required: true, min: 1 },
    description: { type: String, trim: true, maxlength: 200, default: 'Admin wallet adjustment' },
    referenceId: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

buddyWalletAdjustmentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('BuddyWalletAdjustment', buddyWalletAdjustmentSchema);
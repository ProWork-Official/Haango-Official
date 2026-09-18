import mongoose from 'mongoose';

const walletBonusSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    campaignId: { type: String, required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    claimed: { type: Boolean, default: false },
    claimedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

walletBonusSchema.index({ userId: 1, campaignId: 1 }, { unique: true });

export default mongoose.model('WalletBonus', walletBonusSchema);

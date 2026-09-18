import mongoose from 'mongoose';

const customerWalletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    balance: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('CustomerWallet', customerWalletSchema);

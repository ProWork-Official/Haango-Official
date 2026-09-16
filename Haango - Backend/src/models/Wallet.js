import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    payoutMethod: { type: String, enum: ['BANK', 'UPI'], default: null },
    accountHolderName: { type: String, trim: true, maxlength: 100, default: '' },
    bankName: { type: String, trim: true, maxlength: 100, default: '' },
    accountNumber: { type: String, trim: true, select: false, default: '' },
    ifscCode: { type: String, trim: true, uppercase: true, maxlength: 11, default: '' },
    upiId: { type: String, trim: true, maxlength: 120, default: '' },
    razorpayXContactId: { type: String, trim: true, default: '' },
    razorpayXBankFundAccountId: { type: String, trim: true, default: '' },
    razorpayXUpiFundAccountId: { type: String, trim: true, default: '' },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Wallet', walletSchema);

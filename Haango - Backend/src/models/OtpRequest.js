import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpRequestSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ['SIGNUP', 'LOGIN', 'PASSWORD_RESET'],
      default: 'SIGNUP',
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    ipHash: {
      type: String,
      default: '',
      select: false,
    },
  },
  { timestamps: true }
);

otpRequestSchema.index({ email: 1, purpose: 1, expiresAt: 1 });

otpRequestSchema.methods.compareCode = async function (candidateCode) {
  if (!candidateCode) return false;
  return bcrypt.compare(String(candidateCode).trim(), this.codeHash);
};

otpRequestSchema.statics.hashCode = async function (candidateCode) {
  return bcrypt.hash(String(candidateCode).trim(), 12);
};

export default mongoose.model('OtpRequest', otpRequestSchema);

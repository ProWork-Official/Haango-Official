import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { normalizeEmail } from '../utils/helpers.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
      match: [/^\+?[\d\s-]{10,15}$/, 'Invalid phone number'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['CUSTOMER', 'BUDDY', 'ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'],
      required: true,
      index: true,
      default: 'CUSTOMER',
    },
    isBuddy: { type: Boolean, default: false, index: true },
    likedBuddyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BuddyProfile' }],
    profileImage: { type: String, default: '' },
    city: { type: String, trim: true, default: '', index: true },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'],
      default: 'PREFER_NOT_TO_SAY',
      index: true,
    },
    dateOfBirth: { type: Date, default: null },
    hobbies: [{ type: String, trim: true, default: '' }],
    address: { type: String, trim: true, default: '' },
    gallery: [{ type: String, trim: true, default: '' }],
    referralCode: { type: String, trim: true, uppercase: true, unique: true, sparse: true, index: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    signupCouponCode: { type: String, trim: true, uppercase: true, default: '' },
    profileCompletion: { type: Number, default: 0, min: 0, max: 100 },
    profilePromptDismissedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
    isVerified: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: null, index: true },
    requiresOtpReauth: { type: Boolean, default: false, index: true },
    adminLevel: { type: Number, default: 0, enum: [0, 1, 2, 3] },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (this.isModified('email')) {
    this.email = normalizeEmail(this.email);
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.statics.hashPassword = async function (plainPassword) {
  return bcrypt.hash(plainPassword, 12);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

export default mongoose.model('User', userSchema);

import mongoose from 'mongoose';

const emailUnsubscribeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    optedOutAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

export default mongoose.model('EmailUnsubscribe', emailUnsubscribeSchema);

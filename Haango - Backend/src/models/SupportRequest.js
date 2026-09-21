import mongoose from 'mongoose';

const supportRequestSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    userType: {
      type: String,
      enum: ['USER', 'BUDDY'],
      required: true,
      default: 'USER',
      index: true,
    },
    problemDescription: { type: String, required: true, trim: true, minlength: 10, maxlength: 4000 },
    status: {
      type: String,
      enum: ['PENDING', 'IN_REVIEW', 'RESOLVED'],
      default: 'PENDING',
      index: true,
    },
    adminReply: { type: String, trim: true, default: '', maxlength: 4000 },
    lockedUntil: { type: Date, default: null, index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('SupportRequest', supportRequestSchema);

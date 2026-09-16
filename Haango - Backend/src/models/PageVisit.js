import mongoose from 'mongoose';

const pageVisitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    visitorId: { type: String, required: true, index: true },
    page: { type: String, required: true, index: true },
    timeSpent: { type: Number, default: 0 }, // in seconds
    referrer: { type: String },
    userAgent: { type: String },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('PageVisit', pageVisitSchema);

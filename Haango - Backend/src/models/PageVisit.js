import mongoose from 'mongoose';

const pageVisitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    visitorId: { type: String, required: true, index: true },
    visitId: { type: String, index: true },
    page: { type: String, required: true, index: true },
    timeSpent: { type: Number, default: 0 }, // in seconds
    referrer: { type: String },
    acquisitionSource: {
      type: String,
      enum: ['DIRECT', 'GOOGLE_SEARCH', 'SOCIAL', 'WHATSAPP', 'CUSTOM_SHARE', 'EXTERNAL_REFERRAL', 'OTHER'],
    },
    acquisitionDetail: { type: String, maxlength: 120 },
    userAgent: { type: String },
    ipAddress: { type: String },
    location: {
      country: { type: String, maxlength: 80 },
      region: { type: String, maxlength: 80 },
      city: { type: String, maxlength: 80 },
    },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

pageVisitSchema.index(
  { visitorId: 1, visitId: 1 },
  { unique: true, partialFilterExpression: { visitId: { $type: 'string' } } }
);

export default mongoose.model('PageVisit', pageVisitSchema);

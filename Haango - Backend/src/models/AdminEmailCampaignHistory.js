import mongoose from 'mongoose';

const adminEmailCampaignHistorySchema = new mongoose.Schema(
  {
    listId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminEmailList', required: true, index: true },
    listNumber: { type: Number, required: true },
    listName: { type: String, required: true },
    templateId: { type: String, required: true },
    templateTitle: { type: String, required: true },
    senderEmail: {
      type: String,
      required: true,
      enum: ['haangoofficial@gmail.com', 'support@haango.in'],
    },
    attemptedAt: { type: Date, required: true, default: Date.now, index: true },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'SENT', 'PARTIAL', 'FAILED', 'SKIPPED'],
      default: 'PENDING',
      index: true,
    },
    totalRecipients: { type: Number, required: true, min: 0 },
    attemptedRecipients: { type: Number, required: true, min: 0, default: 0 },
    sent: { type: Number, required: true, min: 0, default: 0 },
    failed: { type: Number, required: true, min: 0, default: 0 },
    skipped: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
);

adminEmailCampaignHistorySchema.index({ attemptedAt: -1, _id: -1 });

export default mongoose.model('AdminEmailCampaignHistory', adminEmailCampaignHistorySchema);

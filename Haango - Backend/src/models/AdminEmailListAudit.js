import mongoose from 'mongoose';

const adminEmailListAuditSchema = new mongoose.Schema(
  {
    listNumber: { type: Number, required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    event: { type: String, enum: ['SIGNED_UP'], required: true, default: 'SIGNED_UP' },
    signedInAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true },
);

export default mongoose.model('AdminEmailListAudit', adminEmailListAuditSchema);

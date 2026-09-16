import mongoose from 'mongoose';

const adminAuditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
    actorRole: { type: String, required: true, immutable: true },
    actorAdminLevel: { type: Number, required: true, immutable: true },
    action: { type: String, required: true, immutable: true, index: true },
    targetType: { type: String, required: true, immutable: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {}, immutable: true },
    ipAddress: { type: String, default: '', immutable: true },
    userAgent: { type: String, default: '', immutable: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

adminAuditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'], function (next) {
  next(new Error('Admin audit logs are immutable'));
});

adminAuditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AdminAuditLog', adminAuditLogSchema);

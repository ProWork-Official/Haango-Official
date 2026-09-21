import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    type: { type: String, enum: ['text', 'call-status'], default: 'text', index: true },
    callStatus: { type: String, enum: ['accepted', 'rejected', 'missed', 'ended'], default: null, index: true },
    isSystem: { type: Boolean, default: false, index: true },
    callId: { type: String, default: null, index: true },
    isDelivered: { type: Boolean, default: true, index: true },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

messageSchema.index({ bookingId: 1, createdAt: 1 });
messageSchema.index({ bookingId: 1, callId: 1, type: 1, callStatus: 1 }, { unique: false });

export default mongoose.model('Message', messageSchema);

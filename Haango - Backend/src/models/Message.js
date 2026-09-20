import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    isDelivered: { type: Boolean, default: true, index: true },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

messageSchema.index({ bookingId: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);

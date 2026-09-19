import mongoose from 'mongoose';

const callSignalSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['CALL_REQUEST', 'CALL_ACCEPT', 'CALL_REJECT', 'CALL_END', 'OFFER', 'ANSWER', 'ICE'] },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

callSignalSchema.index({ bookingId: 1, createdAt: -1 });
callSignalSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 });

export default mongoose.model('CallSignal', callSignalSchema);

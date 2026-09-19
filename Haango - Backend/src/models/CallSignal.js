import mongoose from 'mongoose';

const callSignalSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['REQUEST', 'ACCEPT', 'REJECT', 'END', 'OFFER', 'ANSWER', 'ICE'] },
    callId: { type: String, required: true, index: true },
    mode: { type: String, enum: ['AUDIO', 'VIDEO'], default: 'AUDIO' },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

callSignalSchema.index({ bookingId: 1, createdAt: -1 });
callSignalSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 });

export default mongoose.model('CallSignal', callSignalSchema);

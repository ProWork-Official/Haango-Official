import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['INITIATED', 'RINGING', 'ACCEPTED', 'REJECTED', 'MISSED', 'ENDED', 'TIMED_OUT'],
      default: 'INITIATED',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export default mongoose.model('CallLog', callLogSchema);

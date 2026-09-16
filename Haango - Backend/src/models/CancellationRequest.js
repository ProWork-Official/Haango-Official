import mongoose from 'mongoose';

const cancellationRequestSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true, index: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, enum: ['EMERGENCY', 'SAFETY', 'SCHEDULE_CHANGE', 'BUDDY_UNAVAILABLE', 'OTHER'], required: true },
  details: { type: String, trim: true, maxlength: 2000, default: '' },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING', index: true },
  adminNotes: { type: String, trim: true, maxlength: 2000, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('CancellationRequest', cancellationRequestSchema);

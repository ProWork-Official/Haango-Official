import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buddyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buddyProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'BuddyProfile', required: true },
    activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
    activitySlug: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    startTime: { type: String, required: true },
    duration: { type: Number, required: true, min: 1, max: 8 },
    meetingLocation: { type: String, required: true, trim: true },
    buddyRate: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    bookingStatus: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    meeting: {
      startOtpHash: { type: String, select: false, default: '' },
      endOtpHash: { type: String, select: false, default: '' },
      customerStartOtpHash: { type: String, select: false, default: '' },
      buddyStartOtpHash: { type: String, select: false, default: '' },
      customerEndOtpHash: { type: String, select: false, default: '' },
      buddyEndOtpHash: { type: String, select: false, default: '' },
      startOtpExpiresAt: { type: Date, default: null },
      endOtpExpiresAt: { type: Date, default: null },
      startVerifiedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      endVerifiedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      startedAt: { type: Date, default: null },
      endedAt: { type: Date, default: null },
      callRoomId: { type: String, default: '' },
      locations: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        latitude: { type: Number, min: -90, max: 90 },
        longitude: { type: Number, min: -180, max: 180 },
        accuracy: { type: Number, min: 0 },
        updatedAt: { type: Date, default: Date.now },
      }],
    },
    extensionHours: { type: Number, min: 0, default: 0 },
    extensionAmount: { type: Number, min: 0, default: 0 },
    extensionPaymentStatus: { type: String, enum: ['NONE', 'PENDING', 'PAID'], default: 'NONE' },
    extensionOrderId: { type: String, default: '' },
    extensionPaymentId: { type: String, default: '' },
    extensionSignature: { type: String, default: '' },
    customerNotes: { type: String, trim: true, maxlength: 1000, default: '' },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
  },
  { timestamps: true }
);

bookingSchema.index({ buddyId: 1, date: 1, bookingStatus: 1 });
bookingSchema.index({ customerId: 1, date: 1, bookingStatus: 1 });

export default mongoose.model('Booking', bookingSchema);

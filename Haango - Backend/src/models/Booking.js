import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true, index: true },
    isCleared: { type: Boolean, default: false, index: true },
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
    couponCode: { type: String, trim: true, uppercase: true, default: '' },
    couponDiscount: { type: Number, min: 0, default: 0 },
    bookingStatus: {
      type: String,
      enum: ['PAYMENT_PENDING', 'PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    payment: {
      provider: { type: String, enum: ['PAYU'], default: 'PAYU' },
      status: { type: String, enum: ['NOT_REQUIRED', 'PENDING', 'PAID', 'FAILED', 'ABANDONED', 'REFUND_PENDING', 'REFUNDED'], default: 'NOT_REQUIRED', index: true },
      txnId: { type: String, default: '', trim: true },
      gatewayPaymentId: { type: String, default: '', trim: true },
      amount: { type: Number, min: 0, default: 0 },
      paidAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      failureReason: { type: String, default: '', maxlength: 300 },
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
      locations: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        latitude: { type: Number, min: -90, max: 90 },
        longitude: { type: Number, min: -180, max: 180 },
        accuracy: { type: Number, min: 0 },
        updatedAt: { type: Date, default: Date.now },
      }],
    },
    buddyPayoutAmount: { type: Number, min: 0, default: 0 },
    platformShareAmount: { type: Number, min: 0, default: 0 },
    payoutEligibleAt: { type: Date, default: null },
    payoutStatus: {
      type: String,
      enum: ['PENDING', 'READY', 'PROCESSING', 'PAID', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    customerNotes: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

bookingSchema.index({ buddyId: 1, date: 1, bookingStatus: 1 });
bookingSchema.index({ customerId: 1, date: 1, bookingStatus: 1 });
bookingSchema.index({ 'payment.txnId': 1 }, { unique: true, partialFilterExpression: { 'payment.txnId': { $gt: '' } } });

export default mongoose.model('Booking', bookingSchema);

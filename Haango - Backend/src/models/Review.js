import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buddyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 2000, default: '' },
    images: { type: [String], validate: [(value) => value.length <= 2, 'A review can contain up to 2 images'] },
    activityName: { type: String, default: '' },
  },
  { timestamps: true }
);

reviewSchema.index({ customerId: 1, buddyId: 1 }, { unique: true });
reviewSchema.index({ buddyId: 1, rating: -1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema);

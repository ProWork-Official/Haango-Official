import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import BuddyProfile from '../models/BuddyProfile.js';
import { notFound, badRequest, forbidden, conflict } from '../utils/errors.js';
import { recordAdminAction } from './adminAuditService.js';

export async function createReview(customerId, { bookingId, rating, comment, images = [] }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound('Booking not found');

  if (String(booking.customerId) !== String(customerId)) {
    throw forbidden('Not your booking');
  }

  if (booking.bookingStatus !== 'COMPLETED') {
    throw badRequest('Can only review completed bookings', 'BOOKING_NOT_COMPLETED');
  }

  const existingReview = await Review.findOne({ customerId, buddyId: booking.buddyId });
  if (existingReview) throw conflict('You have already written a review for this profile. Try editing it.', 'ALREADY_REVIEWED');

  const review = await Review.create({
    bookingId,
    customerId,
    buddyId: booking.buddyId,
    rating,
    comment: comment || '',
    activityName: booking.activitySlug,
    images: images.slice(0, 2),
  });

  await updateBuddyRating(booking.buddyId);

  return review;
}

export async function updateReview(customerId, reviewId, { rating, comment, images = [] }) {
  const review = await Review.findOne({ _id: reviewId, customerId });
  if (!review) throw notFound('Review not found');
  review.rating = rating;
  review.comment = comment || '';
  review.images = images.slice(0, 2);
  await review.save();
  await updateBuddyRating(review.buddyId);
  return review;
}

export async function deleteReview(customerId, reviewId) {
  const review = await Review.findOne({ _id: reviewId, customerId });
  if (!review) throw notFound('Review not found');
  const buddyId = review.buddyId;
  await review.deleteOne();
  await updateBuddyRating(buddyId);
  return { deleted: true, reviewId };
}

export async function deleteReviewAsAdmin(reviewId, actor, request) {
  const review = await Review.findById(reviewId);
  if (!review) throw notFound('Review not found');
  const buddyId = review.buddyId;
  await review.deleteOne();
  await updateBuddyRating(buddyId);
  await recordAdminAction({ actor, request, action: 'REVIEW_DELETION', targetType: 'Review', targetId: review._id, metadata: { buddyId, rating: review.rating } });
  return { deleted: true, reviewId };
}

export async function getAllReviews(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    Review.find()
      .populate('customerId', 'name email')
      .populate('buddyId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(),
  ]);
  return { reviews, total };
}

export async function updateBuddyRating(buddyUserId) {
  const stats = await Review.aggregate([
    { $match: { buddyId: buddyUserId } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const buddy = await BuddyProfile.findOne({ userId: buddyUserId });
  if (buddy) {
    buddy.rating = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
    buddy.reviewCount = stats.length > 0 ? stats[0].count : 0;
    await buddy.save();
  }
}

export async function getBuddyReviews(buddyUserId, page = 1, limit = 10, minRating = 0) {
  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    Review.find({ buddyId: buddyUserId, rating: { $gte: minRating } })
      .populate('customerId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ buddyId: buddyUserId, rating: { $gte: minRating } }),
  ]);

  return { reviews, total };
}

export async function getMyReview(customerId, buddyUserId) {
  return Review.findOne({ customerId, buddyId: buddyUserId }).lean();
}

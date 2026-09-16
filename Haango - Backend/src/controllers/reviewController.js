import * as reviewService from '../services/reviewService.js';
import { success, paginated, buildPagination } from '../utils/response.js';

export async function createReview(req, res, next) {
  try {
    const review = await reviewService.createReview(req.user._id, req.body);
    res.status(201).json(success(review));
  } catch (err) {
    next(err);
  }
}

export async function getBuddyReviews(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const minRating = Math.max(0, Math.min(5, Number(req.query.minRating) || 0));
    const { reviews, total } = await reviewService.getBuddyReviews(req.params.buddyId, page, limit, minRating);
    res.json(paginated(reviews, buildPagination(page, limit, total)));
  } catch (err) {
    next(err);
  }
}

export async function updateReview(req, res, next) {
  try {
    res.json(success(await reviewService.updateReview(req.user._id, req.params.id, req.body)));
  } catch (err) {
    next(err);
  }
}

export async function deleteReview(req, res, next) {
  try {
    res.json(success(await reviewService.deleteReview(req.user._id, req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function getMyReview(req, res, next) {
  try {
    res.json(success(await reviewService.getMyReview(req.user._id, req.params.buddyId)));
  } catch (err) {
    next(err);
  }
}

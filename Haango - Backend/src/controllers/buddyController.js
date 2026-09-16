import * as buddyService from '../services/buddyService.js';
import * as featuredBuddyService from '../services/featuredBuddyService.js';
import { success, paginated, buildPagination } from '../utils/response.js';

export async function getFeaturedBuddies(_req, res, next) {
  try {
    res.json(success(await featuredBuddyService.getFeaturedBuddies()));
  } catch (err) {
    next(err);
  }
}

export async function getMyBuddyProfile(req, res, next) {
  try {
    const profile = await buddyService.getBuddyProfileByUserId(req.user._id);
    res.json(success(profile));
  } catch (err) {
    next(err);
  }
}

export async function createMyBuddyProfile(req, res, next) {
  try {
    const profile = await buddyService.createBuddyProfile(req.user._id, req.body || {});
    res.status(201).json(success(profile));
  } catch (err) {
    next(err);
  }
}

export async function updateMyBuddyProfile(req, res, next) {
  try {
    const profile = await buddyService.updateBuddyProfile(req.user._id, req.body || {});
    res.json(success(profile));
  } catch (err) {
    next(err);
  }
}

export async function getBuddies(req, res, next) {
  try {
    const filters = {
      activity: req.query.activity,
      city: req.query.city,
      minPrice: parseInt(req.query.minPrice) || 0,
      maxPrice: parseInt(req.query.maxPrice) || 10000,
      rating: parseFloat(req.query.rating) || 0,
      search: req.query.search || '',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };
    const viewer = req.user || null;
    const { buddies, total } = await buddyService.getBuddies(filters, viewer);
    res.json(paginated(buddies.map((b) => b.toPublicObject()), buildPagination(filters.page, filters.limit, total)));
  } catch (err) {
    next(err);
  }
}

export async function getBuddyById(req, res, next) {
  try {
    const buddy = await buddyService.getBuddyById(req.params.id);
    res.json(success(buddy.toPublicObject()));
  } catch (err) {
    next(err);
  }
}


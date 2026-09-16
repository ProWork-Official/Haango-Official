import { success } from '../utils/response.js';
import { getProfileSummary, updateProfile, dismissProfilePrompt, restoreProfilePrompt, getLikedBuddies, toggleLikedBuddy } from '../services/profileService.js';

export async function getMyProfile(req, res, next) {
  try {
    const result = await getProfileSummary(req.user._id);
    res.json(success(result));
  } catch (error) {
    next(error);
  }
}

export async function saveMyProfile(req, res, next) {
  try {
    const payload = req.body || {};
    const result = await updateProfile(req.user._id, payload);
    res.json(success(result));
  } catch (error) {
    next(error);
  }
}

export async function dismissPrompt(req, res, next) {
  try {
    const result = await dismissProfilePrompt(req.user._id);
    res.json(success(result));
  } catch (error) {
    next(error);
  }
}

export async function restorePrompt(req, res, next) {
  try {
    const result = await restoreProfilePrompt(req.user._id);
    res.json(success(result));
  } catch (error) {
    next(error);
  }
}

export async function getLiked(req, res, next) {
  try {
    res.json(success(await getLikedBuddies(req.user._id)));
  } catch (error) {
    next(error);
  }
}

export async function toggleLike(req, res, next) {
  try {
    res.json(success(await toggleLikedBuddy(req.user._id, req.params.buddyId)));
  } catch (error) {
    next(error);
  }
}

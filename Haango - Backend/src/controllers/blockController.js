import BlockedUser from '../models/BlockedUser.js';
import { success } from '../utils/response.js';
import { badRequest } from '../utils/errors.js';

export async function blockUser(req, res, next) {
  try {
    if (!req.body.blockedUserId || String(req.body.blockedUserId) === String(req.user._id)) {
      throw badRequest('A different user is required', 'INVALID_BLOCK_TARGET');
    }
    const block = await BlockedUser.findOneAndUpdate(
      { userId: req.user._id, blockedUserId: req.body.blockedUserId },
      { userId: req.user._id, blockedUserId: req.body.blockedUserId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(success(block));
  } catch (err) {
    next(err);
  }
}

export async function unblockUser(req, res, next) {
  try {
    await BlockedUser.deleteOne({ userId: req.user._id, blockedUserId: req.params.userId });
    res.json(success({ unblocked: true }));
  } catch (err) {
    next(err);
  }
}

export async function getBlockedUsers(req, res, next) {
  try {
    const blockedUsers = await BlockedUser.find({ userId: req.user._id })
      .populate('blockedUserId', 'name email profileImage')
      .sort({ createdAt: -1 });
    res.json(success(blockedUsers));
  } catch (err) {
    next(err);
  }
}

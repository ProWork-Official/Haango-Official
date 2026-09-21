import SupportRequest from '../models/SupportRequest.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';

export const SUPPORT_LOCK_HOURS = 48;

export function buildSupportLockExpiry(createdAt = new Date()) {
  const value = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return new Date(value.getTime() + SUPPORT_LOCK_HOURS * 60 * 60 * 1000);
}

export function isSupportLockActive(now = new Date(), lockedUntil = null) {
  if (!lockedUntil) return false;
  return new Date(now).getTime() < new Date(lockedUntil).getTime();
}

export async function createSupportRequest(userId, payload = {}) {
  const existingActive = await SupportRequest.findOne({
    createdBy: userId,
    status: { $ne: 'RESOLVED' },
    lockedUntil: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (existingActive) {
    throw conflict('You already have an active support request. Please wait for a response or until the lock expires.', 'SUPPORT_REQUEST_LOCKED');
  }

  const fullName = String(payload.fullName || '').trim();
  const problemDescription = String(payload.problemDescription || '').trim();
  const userType = String(payload.userType || 'USER').toUpperCase();

  if (!fullName || fullName.length < 2) throw badRequest('Full name is required.', 'INVALID_FULL_NAME');
  if (!['USER', 'BUDDY'].includes(userType)) throw badRequest('User type must be USER or BUDDY.', 'INVALID_USER_TYPE');
  if (!problemDescription || problemDescription.length < 10) throw badRequest('Problem description must be at least 10 characters.', 'INVALID_PROBLEM_DESCRIPTION');

  const created = await SupportRequest.create({
    createdBy: userId,
    fullName,
    userType,
    problemDescription,
    status: 'PENDING',
    lockedUntil: buildSupportLockExpiry(new Date()),
  });

  return created;
}

export async function getUserSupportRequests(userId) {
  return SupportRequest.find({ createdBy: userId }).sort({ createdAt: -1 }).lean();
}

export async function getAllSupportRequests(status, page = 1, limit = 20) {
  const query = {};
  if (status) query.status = status;

  const skip = (page - 1) * limit;
  const [requests, total] = await Promise.all([
    SupportRequest.find(query)
      .populate('createdBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SupportRequest.countDocuments(query),
  ]);

  return { requests, total };
}

export async function adminResolveSupportRequest(requestId, adminId, payload = {}) {
  const request = await SupportRequest.findById(requestId);
  if (!request) throw notFound('Support request not found');

  const adminReply = String(payload.adminReply || '').trim();
  const status = String(payload.status || 'RESOLVED').toUpperCase();

  if (!['IN_REVIEW', 'RESOLVED'].includes(status)) {
    throw badRequest('Status must be IN_REVIEW or RESOLVED.', 'INVALID_SUPPORT_STATUS');
  }

  if (status === 'RESOLVED') {
    request.status = 'RESOLVED';
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    if (adminReply) request.adminReply = adminReply;
    request.lockedUntil = null;
  } else {
    request.status = 'IN_REVIEW';
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    if (adminReply) request.adminReply = adminReply;
  }

  await request.save();
  return request;
}

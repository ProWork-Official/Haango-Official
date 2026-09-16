import * as adminService from '../services/adminService.js';
import * as featuredBuddyService from '../services/featuredBuddyService.js';
import { success, paginated, buildPagination } from '../utils/response.js';
import User from '../models/User.js';
import * as reviewService from '../services/reviewService.js';
import * as bookingService from '../services/bookingService.js';
import * as adminAuditService from '../services/adminAuditService.js';

export async function getDashboard(req, res, next) {
  try {
    const stats = await adminService.getDashboardStats();
    res.json(success(stats));
  } catch (err) {
    next(err);
  }
}

export async function getUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { users, total } = await adminService.getAllUsers(page, limit, req.query.includeAdmins === 'true');
    res.json(paginated(users, buildPagination(page, limit, total)));
  } catch (err) {
    next(err);
  }
}

export async function getBuddies(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { buddies, total } = await adminService.getAllBuddies(page, limit);
    res.json(paginated(buddies, buildPagination(page, limit, total)));
  } catch (err) {
    next(err);
  }
}

export async function getFeaturedBuddyState(_req, res, next) {
  try {
    // This is intentionally a GET on the admin router, not a buddy profile route.
    // Keep the response shape aligned with the other admin endpoints.
    res.json(success(await featuredBuddyService.getFeaturedBuddyAdminState()));
  } catch (err) {
    next(err);
  }
}

export async function setFeaturedBuddy(req, res, next) {
  try {
    const featured = req.body?.featured === true;
    res.json(success(await featuredBuddyService.setFeaturedBuddy(req.params.id, featured)));
  } catch (err) {
    next(err);
  }
}

export async function updateBuddy(req, res, next) {
  try {
    res.json(success(await adminService.updateBuddy(req.params.id, req.body || {}, req.user, req)));
  } catch (err) {
    next(err);
  }
}

export async function verifyBuddy(req, res, next) {
  try {
    const buddy = await adminService.verifyBuddy(req.params.id, req.user, req);
    res.json(success(buddy));
  } catch (err) {
    next(err);
  }
}

export async function suspendBuddy(req, res, next) {
  try {
    const buddy = await adminService.suspendBuddy(req.params.id, req.user, req);
    res.json(success(buddy));
  } catch (err) {
    next(err);
  }
}

export async function unsuspendBuddy(req, res, next) {
  try {
    const buddy = await adminService.unsuspendBuddy(req.params.id, req.user, req);
    res.json(success(buddy));
  } catch (err) {
    next(err);
  }
}

export async function suspendUser(req, res, next) {
  try {
    const user = await adminService.suspendUser(req.params.id, req.user, req);
    res.json(success(user.toSafeObject()));
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    res.json(success(await adminService.updateUser(req.params.id, req.body || {})));
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    res.json(success(await adminService.deleteUser(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function getReports(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { reports, total } = await adminService.getReports(req.query.status, page, limit);
    res.json(paginated(reports, buildPagination(page, limit, total)));
  } catch (err) {
    next(err);
  }
}

export async function updateReport(req, res, next) {
  try {
    res.json(success(await adminService.updateReport(req.params.id, req.body || {})));
  } catch (err) {
    next(err);
  }
}

export async function promoteToAdmin(req, res, next) {
  try {
    const { userId } = req.body;
    const user = await adminService.promoteUserToAdmin(userId, req.user._id, req);
    res.json(success(user));
  } catch (err) {
    next(err);
  }
}

export async function promoteToSuperAdmin(req, res, next) {
  try {
    const { userId } = req.body;
    const user = await adminService.promoteUserToSuperAdmin(userId, req.user._id, req);
    res.json(success(user));
  } catch (err) {
    next(err);
  }
}

export async function demoteFromAdmin(req, res, next) {
  try {
    const { userId } = req.body;
    const user = await adminService.demoteUserFromAdmin(userId, req.user._id, req);
    res.json(success(user));
  } catch (err) {
    next(err);
  }
}

export async function getAdminUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const adminUsers = await User.find({ role: { $in: ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] } })
      .sort({ adminLevel: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await User.countDocuments({ role: { $in: ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] } });
    res.json(paginated(adminUsers.map((u) => u.toSafeObject()), buildPagination(page, limit, total)));
  } catch (err) {
    next(err);
  }

}

export async function getReviews(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { reviews, total } = await reviewService.getAllReviews(page, limit);
    res.json(paginated(reviews, buildPagination(page, limit, total)));
  } catch (err) {
    next(err);
  }
}

export async function deleteReview(req, res, next) {
  try {
    res.json(success(await reviewService.deleteReviewAsAdmin(req.params.id, req.user, req)));
  } catch (err) {
    next(err);
  }
}
export async function getCancellationRequests(req, res, next) {
    try { res.json(success(await bookingService.getCancellationRequests(req.query.status))); } catch (err) { next(err); }
}
export async function reviewCancellation(req, res, next) {
    try { res.json(success(await bookingService.reviewCancellation(req.params.id, req.user._id, req.body.status, req.body.adminNotes, req))); } catch (err) { next(err); }
}

export async function getAuditLogs(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const { logs, total } = await adminAuditService.getAuditLogs(page, limit, req.query.action);
    res.json(paginated(logs, buildPagination(page, limit, total)));
  } catch (err) {
    next(err);
  }
}

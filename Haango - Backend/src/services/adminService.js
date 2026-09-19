import User from '../models/User.js';
import BuddyProfile from '../models/BuddyProfile.js';
import Booking from '../models/Booking.js';
import Report from '../models/Report.js';
import { notFound, badRequest } from '../utils/errors.js';
import { recordAdminAction } from './adminAuditService.js';

export async function getDashboardStats() {
  const [
    totalUsers,
    totalAdmins,
    totalBuddies,
    verifiedBuddies,
    pendingVerifications,
    totalBookings,
    completedBookings,
    cancelledBookings,
    revenueAgg,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: { $in: ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] } }),
    BuddyProfile.countDocuments(),
    BuddyProfile.countDocuments({ verificationStatus: 'VERIFIED' }),
    BuddyProfile.countDocuments({ verificationStatus: 'PENDING' }),
    Booking.countDocuments(),
    Booking.countDocuments({ bookingStatus: 'COMPLETED' }),
    Booking.countDocuments({ bookingStatus: 'CANCELLED' }),
    Booking.aggregate([
      { $match: { paymentStatus: 'PAID', bookingStatus: 'COMPLETED' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          platformRevenue: { $sum: '$platformFee' },
          buddyFeeRevenue: { $sum: { $multiply: ['$buddyRate', '$duration'] } },
        },
      },
    ]),
  ]);

  const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;
  const platformRevenue = revenueAgg.length > 0 ? revenueAgg[0].platformRevenue : 0;
  const buddyFeeRevenue = revenueAgg.length > 0 ? revenueAgg[0].buddyFeeRevenue : 0;
  const haangoCommission = Math.round(buddyFeeRevenue * 0.2);
  const haangoEarnings = platformRevenue + haangoCommission;
  const averageBookingValue = completedBookings > 0 ? Math.round(totalRevenue / completedBookings) : 0;

  return {
    totalUsers,
    totalAdmins,
    totalBuddies,
    verifiedBuddies,
    pendingVerifications,
    totalBookings,
    completedBookings,
    cancelledBookings,
    totalRevenue,
    platformRevenue,
    haangoCommission,
    haangoEarnings,
    averageBookingValue,
  };
}

export async function getAllUsers(page = 1, limit = 20, includeAdmins = false) {
  const skip = (page - 1) * limit;
  const query = includeAdmins ? {} : { role: { $in: ['CUSTOMER', 'BUDDY'] } };
  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);
  return { users: users.map((u) => u.toSafeObject()), total };
}

export async function getAllBuddies(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [buddies, total] = await Promise.all([
    BuddyProfile.find().populate('userId', 'name email phone city address gender').sort({ createdAt: -1 }).skip(skip).limit(limit),
    BuddyProfile.countDocuments(),
  ]);
  return { buddies, total };
}

export async function updateBuddy(buddyProfileId, updates, actor, request) {
  const buddy = await BuddyProfile.findById(buddyProfileId);
  if (!buddy) throw notFound('Buddy profile not found');

  const userId = buddy.userId?._id || buddy.userId;
  const userUpdates = updates.user || {};
  const profileFields = [
    'displayName', 'age', 'gender', 'about', 'summary', 'city', 'languages',
    'hourlyRate', 'availability', 'responseTime', 'showOnFindCompanions',
    'girlsOnly', 'isAvailable', 'profileImages', 'interests', 'activities',
  ];
  profileFields.forEach((field) => {
    if (updates[field] !== undefined) buddy[field] = updates[field];
  });
  await buddy.save();

  const userFields = ['name', 'email', 'phone', 'city', 'address', 'gender', 'dateOfBirth', 'profileImage'];
  const user = await User.findById(userId);
  if (user) {
    userFields.forEach((field) => {
      if (userUpdates[field] !== undefined) user[field] = userUpdates[field];
    });
    await user.save();
  }
  await recordAdminAction({
    actor, request, action: 'BUDDY_PROFILE_EDIT', targetType: 'BuddyProfile', targetId: buddy._id,
    metadata: { updatedProfileFields: profileFields.filter((field) => updates[field] !== undefined), updatedUserFields: userFields.filter((field) => userUpdates[field] !== undefined) },
  });
  return buddy;
}

export async function verifyBuddy(buddyProfileId, actor, request) {
  const buddy = await BuddyProfile.findByIdAndUpdate(
    buddyProfileId,
    { verificationStatus: 'VERIFIED', verified: true },
    { new: true }
  );
  if (!buddy) throw notFound('Buddy profile not found');
  await recordAdminAction({ actor, request, action: 'BUDDY_VERIFICATION', targetType: 'BuddyProfile', targetId: buddy._id, metadata: { verificationStatus: 'VERIFIED' } });
  return buddy;
}

export async function suspendBuddy(buddyProfileId, actor, request) {
  const buddy = await BuddyProfile.findByIdAndUpdate(
    buddyProfileId,
    { verificationStatus: 'SUSPENDED', isAvailable: false },
    { new: true }
  );
  if (!buddy) throw notFound('Buddy profile not found');
  await recordAdminAction({ actor, request, action: 'USER_SUSPENSION', targetType: 'BuddyProfile', targetId: buddy._id, metadata: { suspensionType: 'BUDDY', verificationStatus: 'SUSPENDED' } });
  return buddy;
}

export async function unsuspendBuddy(buddyProfileId, actor, request) {
  const buddy = await BuddyProfile.findByIdAndUpdate(
    buddyProfileId,
    { verificationStatus: 'VERIFIED', isAvailable: true },
    { new: true }
  );
  if (!buddy) throw notFound('Buddy profile not found');
  await recordAdminAction({ actor, request, action: 'BUDDY_VERIFICATION', targetType: 'BuddyProfile', targetId: buddy._id, metadata: { verificationStatus: 'VERIFIED', restored: true } });
  return buddy;
}

export async function suspendUser(userId, actor, request) {
  const user = await User.findByIdAndUpdate(userId, { isActive: false }, { new: true });
  if (!user) throw notFound('User not found');
  await recordAdminAction({ actor, request, action: 'USER_SUSPENSION', targetType: 'User', targetId: user._id, metadata: { isActive: false } });
  return user;
}

export async function updateUser(userId, updates) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw notFound('User not found');
  if (user.role === 'ADMIN' && updates.role && updates.role !== 'ADMIN') {
    throw badRequest('Admin role cannot be changed here', 'ADMIN_ROLE_PROTECTED');
  }

  const allowedFields = ['name', 'email', 'phone', 'city', 'address', 'gender', 'dateOfBirth', 'isActive', 'role'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) user[field] = updates[field];
  }
  await user.save();
  return user.toSafeObject();
}

export async function deleteUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw notFound('User not found');
  if (user.role === 'ADMIN') throw badRequest('Admin accounts cannot be deleted here', 'ADMIN_DELETE_PROTECTED');

  await Promise.all([
    BuddyProfile.deleteOne({ userId }),
    Booking.deleteMany({ $or: [{ customerId: userId }, { buddyId: userId }] }),
    Report.deleteMany({ $or: [{ reporterId: userId }, { reportedUserId: userId }] }),
    User.deleteOne({ _id: userId }),
  ]);
  return { deleted: true, userId };
}

export async function getReports(status, page = 1, limit = 20) {
  const query = status ? { status } : {};
  const skip = (page - 1) * limit;
  const [reports, total] = await Promise.all([
    Report.find(query).populate('reporterId reportedUserId', 'name email phone').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments(query),
  ]);
  return { reports, total };
}

export async function updateReport(reportId, updates) {
  const report = await Report.findById(reportId);
  if (!report) throw notFound('Report not found');
  if (updates.status) report.status = updates.status;
  if (updates.adminNotes !== undefined) report.adminNotes = updates.adminNotes;
  await report.save();
  return report;
}

export async function promoteUserToAdmin(userId, adminId, request) {
  const currentAdmin = await User.findById(adminId);
  const targetUser = await User.findById(userId);

  if (!targetUser) throw notFound('User not found');
  if (!currentAdmin) throw notFound('Admin not found');

  const currentAdminLevel = currentAdmin.adminLevel || 0;
  if (currentAdminLevel < 1) {
    throw badRequest('Insufficient permissions to promote users', 'INSUFFICIENT_PERMISSIONS');
  }

  const previousRole = targetUser.role;
  targetUser.role = 'ADMIN';
  targetUser.adminLevel = 1;
  await targetUser.save();
  await recordAdminAction({ actor: currentAdmin, request, action: 'ROLE_PROMOTION', targetType: 'User', targetId: targetUser._id, metadata: { fromRole: previousRole, toRole: 'ADMIN', toAdminLevel: 1 } });
  return targetUser.toSafeObject();
}

export async function promoteUserToSuperAdmin(userId, adminId, request) {
  const currentAdmin = await User.findById(adminId);
  const targetUser = await User.findById(userId);

  if (!targetUser) throw notFound('User not found');
  if (!currentAdmin) throw notFound('Admin not found');

  const currentAdminLevel = currentAdmin.adminLevel || 0;
  if (currentAdminLevel < 2) {
    throw badRequest('Only SUPER_ADMIN and MASTER_ADMIN can create SUPER_ADMIN', 'INSUFFICIENT_PERMISSIONS');
  }

  const previousRole = targetUser.role;
  targetUser.role = 'SUPER_ADMIN';
  targetUser.adminLevel = 2;
  await targetUser.save();
  await recordAdminAction({ actor: currentAdmin, request, action: 'ROLE_PROMOTION', targetType: 'User', targetId: targetUser._id, metadata: { fromRole: previousRole, toRole: 'SUPER_ADMIN', toAdminLevel: 2 } });
  return targetUser.toSafeObject();
}

export async function demoteUserFromAdmin(userId, adminId, request) {
  const currentAdmin = await User.findById(adminId);
  const targetUser = await User.findById(userId);

  if (!targetUser) throw notFound('User not found');
  if (!currentAdmin) throw notFound('Admin not found');

  const currentAdminLevel = currentAdmin.adminLevel || 0;
  const targetAdminLevel = targetUser.adminLevel || 0;

  if (targetAdminLevel >= currentAdminLevel) {
    throw badRequest('Cannot demote user with equal or higher admin level', 'INSUFFICIENT_PERMISSIONS');
  }

  // Progressive demotion: one level at a time
  // SUPER_ADMIN (2) → ADMIN (1)
  // ADMIN (1) → CUSTOMER (0)
  if (targetAdminLevel === 2) {
    targetUser.role = 'ADMIN';
    targetUser.adminLevel = 1;
  } else if (targetAdminLevel === 1) {
    targetUser.role = 'CUSTOMER';
    targetUser.adminLevel = 0;
  }
  
  await targetUser.save();
  await recordAdminAction({ actor: currentAdmin, request, action: 'ROLE_DEMOTION', targetType: 'User', targetId: targetUser._id, metadata: { toRole: targetUser.role, toAdminLevel: targetUser.adminLevel } });
  return targetUser.toSafeObject();
}

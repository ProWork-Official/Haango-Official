import User from '../models/User.js';
import BuddyProfile from '../models/BuddyProfile.js';
import Booking from '../models/Booking.js';
import PageVisit from '../models/PageVisit.js';
import Report from '../models/Report.js';
import CustomerWallet from '../models/CustomerWallet.js';
import Withdrawal from '../models/Withdrawal.js';
import { notFound, badRequest } from '../utils/errors.js';
import { adjustWallet } from './customerWalletService.js';

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
    User.countDocuments({ role: 'BUDDY' }),
    BuddyProfile.countDocuments({ verificationStatus: 'VERIFIED' }),
    BuddyProfile.countDocuments({ verificationStatus: 'PENDING' }),
    Booking.countDocuments(),
    Booking.countDocuments({ bookingStatus: 'COMPLETED' }),
    Booking.countDocuments({ bookingStatus: 'CANCELLED' }),
    Booking.aggregate([
      { $match: { bookingStatus: 'COMPLETED' } },
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

export async function getAllUsers(page = 1, limit = 20, includeAdmins = false, search = '', role = '', status = '') {
  const skip = (page - 1) * limit;
  const query = includeAdmins ? {} : { role: { $in: ['CUSTOMER', 'BUDDY'] } };
  if (['CUSTOMER', 'BUDDY'].includes(role)) query.role = role;
  const searchTerm = String(search || '').trim();
  const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (escapedSearch) {
    const searchPattern = new RegExp(escapedSearch, 'i');
    const phoneDigits = searchTerm.replace(/\D/g, '');
    const phonePattern = phoneDigits.length >= 3
      ? new RegExp(phoneDigits.split('').join('[\\s+-]*'))
      : searchPattern;
    query.$or = [{ name: searchPattern }, { email: searchPattern }, { phone: phonePattern }];
  }
  if (['ACTIVE', 'AWAY', 'SLEEPING', 'INACTIVE'].includes(status)) {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const [result] = await User.aggregate([
      { $match: query },
      {
        $lookup: {
          from: PageVisit.collection.name,
          let: { userId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$userId'] } } },
            { $group: { _id: null, lastVisitedAt: { $max: '$timestamp' } } },
          ],
          as: 'latestPageVisit',
        },
      },
      { $set: { latestPageVisitAt: { $arrayElemAt: ['$latestPageVisit.lastVisitedAt', 0] } } },
      {
        $set: {
          lastActiveAt: {
            $cond: [
              { $gt: ['$latestPageVisitAt', '$lastSeenAt'] },
              '$latestPageVisitAt',
              '$lastSeenAt',
            ],
          },
        },
      },
      {
        $set: {
          activityStatus: {
            $switch: {
              branches: [
                {
                  case: {
                    $or: [
                      { $eq: [{ $ifNull: ['$lastActiveAt', null] }, null] },
                      { $lte: ['$lastActiveAt', thirtyDaysAgo] },
                    ],
                  },
                  then: 'INACTIVE',
                },
                { case: { $gt: ['$lastActiveAt', sevenDaysAgo] }, then: 'ACTIVE' },
                { case: { $gt: ['$lastActiveAt', fourteenDaysAgo] }, then: 'AWAY' },
              ],
              default: 'SLEEPING',
            },
          },
        },
      },
      { $match: { activityStatus: status } },
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          users: [{ $skip: skip }, { $limit: limit }, { $project: { _id: 1 } }],
        },
      },
    ]);
    const ids = result?.users.map((user) => user._id) || [];
    const users = ids.length ? await User.find({ _id: { $in: ids } }) : [];
    const usersById = new Map(users.map((user) => [String(user._id), user]));
    return {
      users: ids.map((id) => usersById.get(String(id))?.toSafeObject()).filter(Boolean),
      total: result?.total[0]?.count || 0,
    };
  }

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);
  return { users: users.map((u) => u.toSafeObject()), total };
}

async function getUserWalletBalance(user) {
  return (await CustomerWallet.findOne({ userId: user._id }).select('balance').lean())?.balance || 0;
}

function getUserActivityStatus(lastActiveAt, now = Date.now()) {
  const elapsed = lastActiveAt ? Math.max(0, now - new Date(lastActiveAt).getTime()) : Infinity;
  if (!Number.isFinite(elapsed) || elapsed >= 30 * 24 * 60 * 60 * 1000) return 'INACTIVE';
  if (elapsed >= 14 * 24 * 60 * 60 * 1000) return 'SLEEPING';
  if (elapsed >= 7 * 24 * 60 * 60 * 1000) return 'AWAY';
  return 'ACTIVE';
}

export async function getUserAdminSummary(userId) {
  const user = await User.findById(userId);
  if (!user) throw notFound('User not found');

  const bookingOwnerField = user.role === 'BUDDY' ? 'buddyId' : 'customerId';
  const [bookingSummaryRows, pageVisits] = await Promise.all([
    Booking.aggregate([
      { $match: { [bookingOwnerField]: user._id } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          completedBookings: { $sum: { $cond: [{ $eq: ['$bookingStatus', 'COMPLETED'] }, 1, 0] } },
        },
      },
    ]),
    PageVisit.find({ userId: user._id })
      .select('page timeSpent timestamp')
      .sort({ timestamp: -1 })
      .limit(500)
      .lean(),
  ]);
  const bookingSummary = bookingSummaryRows[0];

  const activityTimestamps = [user.lastSeenAt, pageVisits[0]?.timestamp]
    .filter(Boolean)
    .map((timestamp) => new Date(timestamp))
    .filter((timestamp) => !Number.isNaN(timestamp.getTime()));
  const lastActiveAt = activityTimestamps.length
    ? new Date(Math.max(...activityTimestamps.map((timestamp) => timestamp.getTime())))
    : null;
  const now = Date.now();
  const activityStatus = getUserActivityStatus(lastActiveAt, now);
  const isCurrentlyActive = Boolean(
    user.isActive && user.lastSeenAt && now - new Date(user.lastSeenAt).getTime() <= 2 * 60 * 1000
  );

  const latestSession = [];
  let previousVisitAt = null;
  for (const visit of pageVisits) {
    const visitAt = new Date(visit.timestamp).getTime();
    if (previousVisitAt !== null && previousVisitAt - visitAt > 30 * 60 * 1000) break;
    latestSession.push(visit);
    previousVisitAt = visitAt;
  }

  const pageSummary = new Map();
  for (const visit of latestSession) {
    const current = pageSummary.get(visit.page) || { page: visit.page, timeSpent: 0, visits: 0, lastVisitedAt: visit.timestamp };
    current.timeSpent += Number(visit.timeSpent || 0);
    current.visits += 1;
    pageSummary.set(visit.page, current);
  }
  const visitedPages = [...pageSummary.values()];

  const walletBalance = await getUserWalletBalance(user);

  return {
    referralCode: user.referralCode || '',
    joinedAt: user.createdAt || user._id.getTimestamp(),
    isActive: user.isActive,
    lastActiveAt,
    activityStatus,
    isCurrentlyActive,
    totalBookings: bookingSummary?.totalBookings || 0,
    completedBookings: bookingSummary?.completedBookings || 0,
    walletBalance,
    visitedPages,
    lastSessionTimeSpent: visitedPages.reduce((total, visit) => total + visit.timeSpent, 0),
  };
}

export async function setUserWalletBalance(userId, amount, requestId) {
  const user = await User.findById(userId);
  if (!user) throw notFound('User not found');
  if (!['CUSTOMER', 'BUDDY'].includes(user.role)) {
    throw badRequest('Only customer and buddy wallets can be adjusted', 'INVALID_WALLET_OWNER');
  }
  if (!/^[\w-]{1,100}$/.test(String(requestId || ''))) {
    throw badRequest('A valid wallet adjustment reference is required', 'INVALID_WALLET_ADJUSTMENT_REFERENCE');
  }

  const { balance } = await adjustWallet(
    user._id,
    amount,
    `admin-wallet-${user._id}-${requestId}`,
    { description: 'Wallet adjustment by admin' }
  );
  return { walletBalance: balance };
}

export async function getAllUserStats() {
  const roleFilter = { role: { $in: ['CUSTOMER', 'BUDDY'] } };
  const users = await User.find(roleFilter).select('_id lastSeenAt').lean();
  const userIds = users.map((user) => user._id);
  const latestVisits = userIds.length
    ? await PageVisit.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', lastVisitedAt: { $max: '$timestamp' } } },
    ])
    : [];
  const latestVisitByUser = new Map(latestVisits.map((visit) => [String(visit._id), visit.lastVisitedAt]));
  const counts = { activeAccounts: 0, sleepingAccounts: 0, inactiveAccounts: 0 };
  const now = Date.now();

  for (const user of users) {
    const lastSeenAt = user.lastSeenAt ? new Date(user.lastSeenAt) : null;
    const lastVisitedAt = latestVisitByUser.get(String(user._id));
    const timestamps = [lastSeenAt, lastVisitedAt].filter((timestamp) => timestamp && !Number.isNaN(new Date(timestamp).getTime()));
    const lastActiveAt = timestamps.length
      ? new Date(Math.max(...timestamps.map((timestamp) => new Date(timestamp).getTime())))
      : null;
    const status = getUserActivityStatus(lastActiveAt, now);
    if (status === 'ACTIVE') counts.activeAccounts += 1;
    if (status === 'SLEEPING') counts.sleepingAccounts += 1;
    if (status === 'INACTIVE') counts.inactiveAccounts += 1;
  }

  return { totalUsers: users.length, ...counts };
}

export async function getAllBuddies(page = 1, limit = 20, search = '', status = '') {
  const skip = (page - 1) * limit;
  const query = {};
  if (['PENDING', 'VERIFIED', 'SUSPENDED'].includes(status)) query.verificationStatus = status;

  const searchTerm = String(search || '').trim();
  if (searchTerm) {
    const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchPattern = new RegExp(escapedSearch, 'i');
    const phoneDigits = searchTerm.replace(/\D/g, '');
    const phonePattern = phoneDigits.length >= 3
      ? new RegExp(phoneDigits.split('').join('[\\s+-]*'))
      : searchPattern;
    const matchingUsers = await User.find({
      $or: [{ name: searchPattern }, { email: searchPattern }, { phone: phonePattern }],
    }).distinct('_id');
    query.$or = [
      { displayName: searchPattern },
      { city: searchPattern },
      { userId: { $in: matchingUsers } },
    ];
  }

  const [buddies, total] = await Promise.all([
    BuddyProfile.find(query).populate('userId', 'name email phone city address gender isActive').sort({ createdAt: -1 }).skip(skip).limit(limit),
    BuddyProfile.countDocuments(query),
  ]);
  return { buddies, total };
}

export async function getBuddyStats() {
  const [totalBuddies, verifiedBuddies, pendingBuddies, suspendedBuddies, activeBuddies] = await Promise.all([
    User.countDocuments({ role: 'BUDDY' }),
    BuddyProfile.countDocuments({ verificationStatus: 'VERIFIED' }),
    BuddyProfile.countDocuments({ verificationStatus: 'PENDING' }),
    BuddyProfile.countDocuments({ verificationStatus: 'SUSPENDED' }),
    BuddyProfile.countDocuments({ isAvailable: true, verificationStatus: 'VERIFIED' }),
  ]);
  return { totalBuddies, verifiedBuddies, pendingBuddies, suspendedBuddies, activeBuddies };
}

export async function updateBuddy(buddyProfileId, updates) {
  const buddy = await BuddyProfile.findById(buddyProfileId);
  if (!buddy) throw notFound('Buddy profile not found');

  const userId = buddy.userId?._id || buddy.userId;
  const userUpdates = updates.user || {};
  if (updates.profileImages !== undefined && (!Array.isArray(updates.profileImages) || updates.profileImages.length < 3)) {
    throw badRequest('At least 3 profile photos are required', 'BUDDY_PHOTOS_REQUIRED');
  }
  const profileFields = [
    'displayName', 'age', 'gender', 'about', 'summary', 'city', 'languages', 'hobbies',
    'hourlyRate', 'availability', 'responseTime', 'showOnFindCompanions',
    'girlsOnly', 'isAvailable', 'profileImages', 'interests', 'activities',
  ];
  profileFields.forEach((field) => {
    if (updates[field] !== undefined) buddy[field] = updates[field];
  });
  if (updates.profileImages !== undefined) buddy.gallery = updates.profileImages;
  if (updates.hobbies !== undefined) buddy.interests = updates.hobbies;
  await buddy.save();

  const userFields = ['name', 'email', 'phone', 'city', 'address', 'gender', 'dateOfBirth', 'profileImage'];
  const user = await User.findById(userId);
  if (user) {
    userFields.forEach((field) => {
      if (userUpdates[field] !== undefined) user[field] = userUpdates[field];
    });
    await user.save();
  }
  return buddy;
}

export async function verifyBuddy(buddyProfileId) {
  const buddy = await BuddyProfile.findByIdAndUpdate(
    buddyProfileId,
    { verificationStatus: 'VERIFIED', verified: true },
    { new: true }
  );
  if (!buddy) throw notFound('Buddy profile not found');
  return buddy;
}

export async function suspendBuddy(buddyProfileId) {
  const buddy = await BuddyProfile.findByIdAndUpdate(
    buddyProfileId,
    { verificationStatus: 'SUSPENDED', isAvailable: false },
    { new: true }
  );
  if (!buddy) throw notFound('Buddy profile not found');
  return buddy;
}

export async function unsuspendBuddy(buddyProfileId) {
  const buddy = await BuddyProfile.findByIdAndUpdate(
    buddyProfileId,
    { verificationStatus: 'VERIFIED', isAvailable: true },
    { new: true }
  );
  if (!buddy) throw notFound('Buddy profile not found');
  return buddy;
}

export async function suspendUser(userId) {
  const user = await User.findByIdAndUpdate(userId, { isActive: false }, { new: true });
  if (!user) throw notFound('User not found');
  return user;
}

export async function updateUser(userId, updates) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw notFound('User not found');
  if (user.role === 'ADMIN' && updates.role && updates.role !== 'ADMIN') {
    throw badRequest('Admin role cannot be changed here', 'ADMIN_ROLE_PROTECTED');
  }

  const allowedFields = ['name', 'email', 'phone', 'city', 'address', 'gender', 'dateOfBirth', 'hobbies', 'profileImage', 'isActive', 'role'];
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

export async function promoteUserToAdmin(userId, adminId) {
  const currentAdmin = await User.findById(adminId);
  const targetUser = await User.findById(userId);

  if (!targetUser) throw notFound('User not found');
  if (!currentAdmin) throw notFound('Admin not found');

  const currentAdminLevel = currentAdmin.adminLevel || 0;
  if (currentAdminLevel < 1) {
    throw badRequest('Insufficient permissions to promote users', 'INSUFFICIENT_PERMISSIONS');
  }

  targetUser.role = 'ADMIN';
  targetUser.adminLevel = 1;
  await targetUser.save();
  return targetUser.toSafeObject();
}

export async function promoteUserToSuperAdmin(userId, adminId) {
  const currentAdmin = await User.findById(adminId);
  const targetUser = await User.findById(userId);

  if (!targetUser) throw notFound('User not found');
  if (!currentAdmin) throw notFound('Admin not found');

  const currentAdminLevel = currentAdmin.adminLevel || 0;
  if (currentAdminLevel < 2) {
    throw badRequest('Only SUPER_ADMIN and MASTER_ADMIN can create SUPER_ADMIN', 'INSUFFICIENT_PERMISSIONS');
  }

  targetUser.role = 'SUPER_ADMIN';
  targetUser.adminLevel = 2;
  await targetUser.save();
  return targetUser.toSafeObject();
}

export async function demoteUserFromAdmin(userId, adminId) {
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
  return targetUser.toSafeObject();
}

import { RETIRED_MASTER_ADMIN_EMAIL } from '../config/adminAccounts.js';

const expectedRole = 'MASTER_ADMIN';
const expectedAdminLevel = 3;

export async function removeRetiredMasterAdmin({ User, RefreshToken, OtpRequest, PushSubscription }) {
  const user = await User.findOne({ email: RETIRED_MASTER_ADMIN_EMAIL });
  if (!user) return { removed: false, reason: 'NOT_FOUND' };

  if (user.role !== expectedRole || user.adminLevel !== expectedAdminLevel) {
    throw new Error('Refusing removal: the matching account is not a level-3 master admin.');
  }

  // Delete only authentication/session material tied directly to this identity.
  // Business history and other records referencing the user are intentionally retained.
  const refreshTokens = await RefreshToken.deleteMany({ userId: user._id });
  const otpRequests = await OtpRequest.deleteMany({ email: RETIRED_MASTER_ADMIN_EMAIL });
  const pushSubscriptions = await PushSubscription.deleteMany({ userId: user._id });

  const result = await User.deleteOne({
    _id: user._id,
    email: RETIRED_MASTER_ADMIN_EMAIL,
    role: expectedRole,
    adminLevel: expectedAdminLevel,
  });
  if (result.deletedCount !== 1) {
    throw new Error('Refusing removal: the target account changed during cleanup.');
  }

  return {
    removed: true,
    refreshTokens: refreshTokens.deletedCount,
    otpRequests: otpRequests.deletedCount,
    pushSubscriptions: pushSubscriptions.deletedCount,
  };
}

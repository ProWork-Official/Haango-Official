import User from '../models/User.js';
import BuddyProfile from '../models/BuddyProfile.js';
import { badRequest } from '../utils/errors.js';

export function computeProfileCompletion(user) {
  if (!user) return 0;

  const checks = [
    user.name && user.name.trim().length >= 2,
    user.gender && user.gender !== 'PREFER_NOT_TO_SAY',
    user.dateOfBirth,
    Array.isArray(user.hobbies) && user.hobbies.some((h) => String(h).trim()),
    user.address && user.address.trim().length >= 5,
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

export async function getProfileSummary(userId) {
  const user = await User.findById(userId);
  if (!user) throw badRequest('User not found', 'USER_NOT_FOUND');

  const completion = computeProfileCompletion(user);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      dateOfBirth: user.dateOfBirth,
      hobbies: user.hobbies || [],
      address: user.address || '',
      profileCompletion: completion,
      profilePromptDismissedAt: user.profilePromptDismissedAt || null,
    },
    completion,
  };
}

export async function updateProfile(userId, payload = {}) {
  const user = await User.findById(userId);
  if (!user) throw badRequest('User not found', 'USER_NOT_FOUND');

  const { name, gender, dateOfBirth, hobbies, address } = payload;

  if (typeof name === 'string' && name.trim()) user.name = name.trim();
  if (gender) user.gender = gender;
  if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);

  if (Array.isArray(hobbies)) {
    user.hobbies = hobbies
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  if (typeof address === 'string') user.address = address.trim();

  user.profileCompletion = computeProfileCompletion(user);
  await user.save();

  return getProfileSummary(userId);
}

export async function dismissProfilePrompt(userId) {
  const user = await User.findById(userId);
  if (!user) throw badRequest('User not found', 'USER_NOT_FOUND');

  user.profilePromptDismissedAt = new Date();
  await user.save();

  return { message: 'Profile prompt dismissed' };
}

export async function restoreProfilePrompt(userId) {
  const user = await User.findById(userId);
  if (!user) throw badRequest('User not found', 'USER_NOT_FOUND');

  user.profilePromptDismissedAt = null;
  await user.save();

  return { message: 'Profile prompt restored' };
}

export async function getLikedBuddies(userId) {
  const user = await User.findById(userId).select('likedBuddyIds');
  if (!user) throw badRequest('User not found', 'USER_NOT_FOUND');
  return BuddyProfile.find({
    _id: { $in: user.likedBuddyIds || [] },
    verificationStatus: 'VERIFIED',
  }).populate('userId');
}

export async function toggleLikedBuddy(userId, buddyId) {
  const [user, buddy] = await Promise.all([
    User.findById(userId),
    BuddyProfile.findById(buddyId),
  ]);
  if (!user) throw badRequest('User not found', 'USER_NOT_FOUND');
  if (!buddy) throw badRequest('Buddy profile not found', 'BUDDY_NOT_FOUND');

  const likedIds = (user.likedBuddyIds || []).map(String);
  const index = likedIds.indexOf(String(buddyId));
  const liked = index === -1;
  if (liked) user.likedBuddyIds.push(buddy._id);
  else user.likedBuddyIds.splice(index, 1);
  await user.save();
  return { liked, buddyId: buddy._id };
}

import BuddyProfile from '../models/BuddyProfile.js';
import User from '../models/User.js';
import { notFound, badRequest } from '../utils/errors.js';
import { ensureEarlyStarterBonus } from './bonusService.js';

function getAgeFromDate(date) {
  if (!date) return null;
  const birthDate = new Date(date);
  if (Number.isNaN(birthDate.getTime())) return null;
  const diff = Date.now() - birthDate.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function normalizeProfileImages(images) {
  return Array.isArray(images)
    ? images.map((image) => String(image).trim()).filter(Boolean)
    : [];
}

function normalizeStringArray(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => String(item).trim()).filter(Boolean);
}

async function syncBuddyUserStatus(userId) {
  const user = await User.findById(userId);
  if (!user) return;

  const shouldBecomeBuddy = true;
  if (!shouldBecomeBuddy) return;

  user.role = 'BUDDY';
  user.isBuddy = true;
  await user.save();
}

function computeBuddyProfileCompletion(buddy) {
  if (!buddy) return 0;

  const user = buddy.userId && typeof buddy.userId === 'object' ? buddy.userId : null;
  const displayName = (buddy.displayName && buddy.displayName.trim()) || (user?.name && user.name.trim()) || '';
  const gender = (buddy.gender && buddy.gender !== 'PREFER_NOT_TO_SAY') ? buddy.gender : user?.gender || null;
  const age = buddy.age && buddy.age >= 18 ? buddy.age : (user?.dateOfBirth ? getAgeFromDate(user.dateOfBirth) : null);
  const summary = (buddy.summary || '').trim();
  const about = (buddy.about || '').trim();
  const city = (buddy.city && buddy.city.trim()) || (user?.city && user.city.trim()) || (user?.address && user.address.trim()) || '';
  const languages = Array.isArray(buddy.languages) && buddy.languages.some((lang) => String(lang).trim()) ? buddy.languages : [];
  const availability = Array.isArray(buddy.availability) ? buddy.availability : [];
  const responseTime = (buddy.responseTime || '').trim();
  const profileImages = Array.isArray(buddy.profileImages) ? buddy.profileImages : [];

  const checks = [
    Boolean(displayName && displayName.trim().length >= 2),
    Boolean(gender),
    Boolean(age && age >= 18),
    Boolean(summary && summary.length >= 10),
    Boolean(about && about.length >= 20),
    Boolean(city && city.trim().length >= 2),
    languages.some((lang) => String(lang).trim()),
    availability.some((slot) => slot && slot.day && slot.startTime && slot.endTime),
    Boolean(responseTime && responseTime.length >= 3),
    profileImages.length >= 2,
  ];

  const percentage = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const hasRequiredCompanionData = Boolean(
    displayName &&
    gender &&
    age &&
    summary &&
    about &&
    city &&
    languages.some((item) => String(item).trim()) &&
    availability.some((slot) => slot && slot.day && slot.startTime && slot.endTime) &&
    responseTime &&
    profileImages.length >= 2
  );

  return hasRequiredCompanionData ? 100 : percentage;
}

export async function getBuddies(filters, viewer = null) {
  const {
    city,
    activity,
    minPrice = 0,
    maxPrice = 10000,
    rating = 0,
    search = '',
    page = 1,
    limit = 20,
  } = filters;

  const query = {
    verificationStatus: 'VERIFIED',
    isAvailable: true,
    showOnFindCompanions: true,
    profileCompletion: 100,
    hourlyRate: { $gte: minPrice, $lte: maxPrice },
    rating: { $gte: rating },
  };

  if (viewer && viewer.gender && viewer.gender === 'FEMALE') {
    query.$or = [{ girlsOnly: false }, { girlsOnly: true }];
  } else {
    query.girlsOnly = false;
  }

  if (city) query.city = new RegExp(city, 'i');
  if (activity) {
    query.activities = { $in: [String(activity).trim(), String(activity).trim().toLowerCase()] };
  }
  if (search) {
    const safeSearch = String(search).trim();
    if (safeSearch) {
      const pattern = new RegExp(safeSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { displayName: pattern },
        { summary: pattern },
        { about: pattern },
        { city: pattern },
        { languages: pattern },
        { hobbies: pattern },
        { interests: pattern },
        { activities: pattern },
      ];
    }
  }

  const skip = (page - 1) * limit;
  const [buddies, total] = await Promise.all([
    BuddyProfile.find(query).populate('userId').sort({ rating: -1, completedBookings: -1 }).skip(skip).limit(limit),
    BuddyProfile.countDocuments(query),
  ]);

  return { buddies, total };
}

export async function getBuddyById(id) {
  const buddy = await BuddyProfile.findById(id).populate('userId');
  if (!buddy) throw notFound('Buddy not found');
  if (buddy.verificationStatus !== 'VERIFIED' || !buddy.showOnFindCompanions) throw notFound('Buddy not found');
  return buddy;
}

export async function getBuddyProfileByUserId(userId) {
  return BuddyProfile.findOne({ userId }).populate('userId');
}

export async function createBuddyProfile(userId, data) {
  const existing = await BuddyProfile.findOne({ userId });
  if (existing) throw badRequest('Buddy profile already exists', 'PROFILE_EXISTS');

  const user = await User.findById(userId);
  const hourlyRate = Number(data.hourlyRate ?? 300);
  if (!Number.isFinite(hourlyRate) || hourlyRate < 300 || hourlyRate > 400) {
    throw badRequest('Hourly rate must be between ₹300 and ₹400', 'INVALID_HOURLY_RATE');
  }
  const profileImages = normalizeProfileImages(data.profileImages);
  if (profileImages.length < 2) {
    throw badRequest('Upload at least 2 photos to create your buddy profile', 'BUDDY_PHOTOS_REQUIRED');
  }
  if (data.girlsOnly && data.gender !== 'FEMALE') {
    throw badRequest('Only female companions can enable girls-only visibility', 'GIRLS_ONLY_RESTRICTED');
  }

  const inferredAge = user?.dateOfBirth ? getAgeFromDate(user.dateOfBirth) : (data.age ?? null);
  const interests = normalizeStringArray(Array.isArray(data.interests) ? data.interests : data.hobbies);
  const activities = normalizeStringArray(data.activities);
  const profile = await BuddyProfile.create({
    userId,
    displayName: data.displayName || user?.name || 'Buddy',
    age: inferredAge,
    gender: data.gender || user?.gender || 'PREFER_NOT_TO_SAY',
    about: data.about || '',
    summary: data.summary || '',
    tagline: data.tagline || data.summary || '',
    city: data.city || user?.city || user?.address || '',
    location: data.location || data.city || user?.city || user?.address || '',
    languages: normalizeStringArray(data.languages),
    hobbies: interests,
    interests,
    activities,
    hourlyRate,
    availability: data.availability || [],
    responseTime: data.responseTime || '',
    profileImages,
    gallery: profileImages,
    showOnFindCompanions: data.showOnFindCompanions !== false,
    girlsOnly: Boolean(data.girlsOnly),
    available: data.available !== false,
    verified: Boolean(data.verified),
  });

  if (user) {
    await syncBuddyUserStatus(user._id);
  }

  profile.profileCompletion = computeBuddyProfileCompletion(profile);
  profile.verificationStatus = profile.profileCompletion >= 100 ? 'VERIFIED' : 'PENDING';
  if (profile.profileCompletion >= 100) {
    profile.showOnFindCompanions = true;
  }
  await profile.save();
  await ensureEarlyStarterBonus(userId);
  return profile;
}

export async function updateBuddyProfile(userId, updates) {
  const allowedFields = [
    'displayName', 'age', 'gender', 'about', 'summary', 'city', 'languages', 'hobbies', 'hourlyRate', 'availability', 'responseTime',
    'profileImages', 'isAvailable', 'showOnFindCompanions', 'girlsOnly', 'verificationStatus',
  ];

  const cleanUpdates = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) cleanUpdates[key] = updates[key];
  }

  if (cleanUpdates.interests !== undefined || cleanUpdates.hobbies !== undefined) {
    const nextInterests = normalizeStringArray(cleanUpdates.interests ?? cleanUpdates.hobbies ?? []);
    cleanUpdates.interests = nextInterests;
    cleanUpdates.hobbies = nextInterests;
  }

  if (cleanUpdates.activities !== undefined) {
    cleanUpdates.activities = normalizeStringArray(cleanUpdates.activities);
  }

  if (cleanUpdates.profileImages !== undefined) {
    cleanUpdates.profileImages = normalizeProfileImages(cleanUpdates.profileImages);
    if (cleanUpdates.profileImages.length < 2) {
      throw badRequest('Upload at least 2 photos for your buddy profile', 'BUDDY_PHOTOS_REQUIRED');
    }
    cleanUpdates.gallery = cleanUpdates.profileImages;
  }

  if (cleanUpdates.girlsOnly && cleanUpdates.gender && cleanUpdates.gender !== 'FEMALE') {
    throw badRequest('Only female companions can enable girls-only visibility', 'GIRLS_ONLY_RESTRICTED');
  }

  const user = await User.findById(userId);
  if (cleanUpdates.hourlyRate !== undefined) {
    const hourlyRate = Number(cleanUpdates.hourlyRate);
    if (!Number.isFinite(hourlyRate) || hourlyRate < 300 || hourlyRate > 400) {
      throw badRequest('Hourly rate must be between ₹300 and ₹400', 'INVALID_HOURLY_RATE');
    }
    cleanUpdates.hourlyRate = hourlyRate;
  }
  const derivedAge = user?.dateOfBirth ? getAgeFromDate(user.dateOfBirth) : (cleanUpdates.age ?? null);
  if (derivedAge !== null) {
    cleanUpdates.age = derivedAge;
  }

  let buddy = await BuddyProfile.findOne({ userId }).populate('userId');
  if (!buddy) {
    const pendingInterests = normalizeStringArray(cleanUpdates.interests ?? cleanUpdates.hobbies ?? []);
    const pendingActivities = normalizeStringArray(cleanUpdates.activities ?? []);
    buddy = await BuddyProfile.create({
      userId,
      displayName: cleanUpdates.displayName || user?.name || 'Buddy',
      gender: cleanUpdates.gender || user?.gender || 'PREFER_NOT_TO_SAY',
      age: cleanUpdates.age ?? (user?.dateOfBirth ? getAgeFromDate(user.dateOfBirth) : null),
      about: cleanUpdates.about || '',
      summary: cleanUpdates.summary || '',
      tagline: cleanUpdates.tagline || cleanUpdates.summary || '',
      city: cleanUpdates.city || user?.city || user?.address || '',
      location: cleanUpdates.location || cleanUpdates.city || user?.city || user?.address || '',
      languages: normalizeStringArray(cleanUpdates.languages ?? []),
      hobbies: pendingInterests,
      interests: pendingInterests,
      activities: pendingActivities,
      hourlyRate: cleanUpdates.hourlyRate ?? 300,
      availability: Array.isArray(cleanUpdates.availability) ? cleanUpdates.availability : [],
      responseTime: cleanUpdates.responseTime || 'Usually replies within a few hours',
      profileImages: cleanUpdates.profileImages ?? [],
      gallery: cleanUpdates.profileImages ?? [],
      showOnFindCompanions: cleanUpdates.showOnFindCompanions !== false,
      girlsOnly: Boolean(cleanUpdates.girlsOnly),
      verificationStatus: cleanUpdates.verificationStatus || 'PENDING',
      available: cleanUpdates.isAvailable !== false,
    });
  }

  Object.assign(buddy, cleanUpdates);
  if (cleanUpdates.showOnFindCompanions !== undefined) {
    buddy.showOnFindCompanions = Boolean(cleanUpdates.showOnFindCompanions);
  }
  if (!buddy.city && buddy.userId) {
    buddy.city = buddy.userId.city || buddy.userId.address || '';
  }
  if (!buddy.gender || buddy.gender === 'PREFER_NOT_TO_SAY') {
    buddy.gender = buddy.userId?.gender || 'PREFER_NOT_TO_SAY';
  }
  if ((!buddy.age || buddy.age < 18) && buddy.userId?.dateOfBirth) {
    buddy.age = getAgeFromDate(buddy.userId.dateOfBirth);
  }
  if (buddy.girlsOnly && buddy.gender !== 'FEMALE') {
    buddy.girlsOnly = false;
  }

  buddy.profileCompletion = computeBuddyProfileCompletion(buddy);
  buddy.verificationStatus = buddy.profileCompletion >= 100 ? 'VERIFIED' : 'PENDING';

  if (!Array.isArray(buddy.languages) || !buddy.languages.some((item) => String(item).trim())) {
    buddy.languages = Array.isArray(buddy.userId?.hobbies) ? buddy.userId.hobbies : [];
  }

  await buddy.save({ validateBeforeSave: true });
  await syncBuddyUserStatus(userId);
  return buddy.populate('userId');
}

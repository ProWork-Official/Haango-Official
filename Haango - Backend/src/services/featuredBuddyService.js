import BuddyProfile from '../models/BuddyProfile.js';
import FeaturedBuddyConfig from '../models/FeaturedBuddyConfig.js';
import { badRequest, notFound } from '../utils/errors.js';

const MIN_ELIGIBLE_BUDDIES = 11;
const FEATURED_SLOT_COUNT = 4;
const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;

const eligibleQuery = {
  verificationStatus: 'VERIFIED',
  isAvailable: true,
  showOnFindCompanions: true,
  girlsOnly: false,
};

async function getConfig() {
  return FeaturedBuddyConfig.findOneAndUpdate(
    { key: 'home-hero' },
    { $setOnInsert: { key: 'home-hero' } },
    { new: true, upsert: true }
  );
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function idsMatch(left, right) {
  return String(left) === String(right);
}

export async function getFeaturedBuddies() {
  const [config, eligibleBuddies] = await Promise.all([
    getConfig(),
    BuddyProfile.find(eligibleQuery).populate('userId'),
  ]);

  const pinnedIds = config.pinnedBuddyIds.map((id) => String(id));
  const pinnedBuddies = pinnedIds
    .map((id) => eligibleBuddies.find((buddy) => idsMatch(buddy._id, id)))
    .filter(Boolean);
  const activePinnedIds = pinnedBuddies.map((buddy) => String(buddy._id));

  if (eligibleBuddies.length === 0) {
    return {
      buddies: [],
      eligibleCount: 0,
      isLive: false,
      pinnedBuddyIds: [],
      nextRefreshAt: null,
    };
  }

  const randomSlotCount = Math.max(0, FEATURED_SLOT_COUNT - pinnedBuddies.length);
  const eligibleRandomBuddies = eligibleBuddies.filter(
    (buddy) => !activePinnedIds.some((id) => idsMatch(buddy._id, id))
  );
  const selectedIds = config.selectedBuddyIds.map((id) => String(id));
  const selectedBuddies = selectedIds
    .map((id) => eligibleRandomBuddies.find((buddy) => idsMatch(buddy._id, id)))
    .filter(Boolean);
  const isSelectionCurrent = config.selectedAt
    && Date.now() - new Date(config.selectedAt).getTime() < ROTATION_INTERVAL_MS
    && selectedBuddies.length === randomSlotCount;

  let randomBuddies = selectedBuddies;
  if (!isSelectionCurrent) {
    randomBuddies = shuffle(eligibleRandomBuddies).slice(0, randomSlotCount);
    config.selectedBuddyIds = randomBuddies.map((buddy) => buddy._id);
    config.selectedAt = new Date();
    await config.save();
  }

  return {
    buddies: [...pinnedBuddies, ...randomBuddies].slice(0, FEATURED_SLOT_COUNT).map((buddy) => buddy.toPublicObject()),
    eligibleCount: eligibleBuddies.length,
    isLive: true,
    pinnedBuddyIds: activePinnedIds,
    nextRefreshAt: config.selectedAt ? new Date(new Date(config.selectedAt).getTime() + ROTATION_INTERVAL_MS) : null,
  };
}

export async function getFeaturedBuddyAdminState() {
  const [config, eligibleCount] = await Promise.all([
    getConfig(),
    BuddyProfile.countDocuments(eligibleQuery),
  ]);

  return {
    pinnedBuddyIds: config.pinnedBuddyIds.map((id) => String(id)),
    eligibleCount,
    maxPinned: FEATURED_SLOT_COUNT,
  };
}

export async function setFeaturedBuddy(buddyId, featured) {
  const buddy = await BuddyProfile.findOne({ _id: buddyId, ...eligibleQuery });
  if (!buddy) throw notFound('Only eligible Find Companions profiles can be featured');

  const config = await getConfig();
  const currentIds = config.pinnedBuddyIds.map((id) => String(id));
  const alreadyFeatured = currentIds.includes(String(buddy._id));

  if (featured && !alreadyFeatured) {
    if (currentIds.length >= FEATURED_SLOT_COUNT) {
      throw badRequest(`You can feature up to ${FEATURED_SLOT_COUNT} companion profiles`, 'FEATURED_LIMIT_REACHED');
    }
    config.pinnedBuddyIds.push(buddy._id);
  }

  if (!featured && alreadyFeatured) {
    config.pinnedBuddyIds = config.pinnedBuddyIds.filter((id) => !idsMatch(id, buddy._id));
  }

  config.selectedBuddyIds = [];
  config.selectedAt = null;
  await config.save();
  return getFeaturedBuddyAdminState();
}

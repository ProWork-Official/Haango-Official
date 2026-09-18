import WalletBonus from '../models/WalletBonus.js';
import BuddyProfile from '../models/BuddyProfile.js';
import { badRequest, notFound } from '../utils/errors.js';

export const EARLY_STARTER_BONUS = {
  campaignId: 'EARLY_STARTER_BONUS_2026',
  name: 'Early Starter Bonus',
  amount: 75,
  expiresAt: new Date('2026-10-30T23:59:59.999+05:30'),
};

function isCampaignActive() {
  return new Date() <= EARLY_STARTER_BONUS.expiresAt;
}

export async function ensureEarlyStarterBonus(userId) {
  if (!isCampaignActive()) return null;
  const profile = await BuddyProfile.findOne({ userId }).select('_id createdAt');
  if (!profile || profile.createdAt > EARLY_STARTER_BONUS.expiresAt) return null;

  return WalletBonus.findOneAndUpdate(
    { userId, campaignId: EARLY_STARTER_BONUS.campaignId },
    {
      userId,
      campaignId: EARLY_STARTER_BONUS.campaignId,
      name: EARLY_STARTER_BONUS.name,
      amount: EARLY_STARTER_BONUS.amount,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function getBonusStatus(userId) {
  const bonus = await ensureEarlyStarterBonus(userId);
  if (!bonus) return { bonus: null, claimable: false, expired: !isCampaignActive() };

  return {
    bonus: {
      id: bonus._id,
      name: bonus.name,
      amount: bonus.amount,
      claimed: bonus.claimed,
      claimedAt: bonus.claimedAt,
      expiresAt: EARLY_STARTER_BONUS.expiresAt,
    },
    claimable: !bonus.claimed && isCampaignActive(),
    expired: !isCampaignActive(),
  };
}

export async function claimEarlyStarterBonus(userId) {
  if (!isCampaignActive()) throw badRequest('This bonus expired on 30 October 2026.', 'BONUS_EXPIRED');
  const bonus = await ensureEarlyStarterBonus(userId);
  if (!bonus) throw notFound('Early Starter Bonus is not available for this account');

  bonus.claimed = true;
  bonus.claimedAt = bonus.claimedAt || new Date();
  await bonus.save();
  return getBonusStatus(userId);
}

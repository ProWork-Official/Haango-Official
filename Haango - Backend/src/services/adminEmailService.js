import Booking from '../models/Booking.js';
import BuddyProfile from '../models/BuddyProfile.js';
import User from '../models/User.js';
import { env } from '../config/environment.js';
import { getAdminCampaignTemplates, sendAdminCampaignEmail } from './emailService.js';

const allowedMilestones = new Set([5, 10, 18]);

function requestError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

function getTemplate(templateId) {
  const template = getAdminCampaignTemplates().find((item) => item.id === templateId);
  if (!template) throw requestError('Select a valid email template.');
  return template;
}

async function getTriggeredRecipients(template, milestone) {
  const activeBuddyUsers = () => User.find({ role: 'BUDDY', isActive: true })
    .select('name email role referralCode')
    .lean();

  if (template.trigger === 'abandoned_booking') {
    const now = Date.now();
    const customerIds = await Booking.distinct('customerId', {
      bookingStatus: 'PAYMENT_PENDING',
      createdAt: { $lte: new Date(now - 30 * 60 * 1000), $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) },
    });
    return User.find({ _id: { $in: customerIds }, role: 'CUSTOMER', isActive: true })
      .select('name email role')
      .lean();
  }

  if (template.trigger === 'inactive_14_days') {
    const inactiveSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    return User.find({
      role: 'CUSTOMER',
      isActive: true,
      $or: [{ lastSeenAt: { $lte: inactiveSince } }, { lastSeenAt: null }],
    })
      .select('name email role')
      .lean();
  }

  if (template.trigger === 'buddy_profile_incomplete') {
    const users = await activeBuddyUsers();
    const userIds = users.map((user) => user._id);
    const profiles = await BuddyProfile.find({ userId: { $in: userIds } })
      .select('userId verificationStatus profileCompletion profileImages')
      .lean();
    const completeProfiles = new Set(profiles
      .filter((profile) => profile.verificationStatus === 'VERIFIED'
        && profile.profileCompletion >= 100
        && (profile.profileImages?.length || 0) >= 2)
      .map((profile) => String(profile.userId)));
    return users.filter((user) => !completeProfiles.has(String(user._id)));
  }

  if (template.trigger === 'buddy_milestone') {
    if (!allowedMilestones.has(Number(milestone))) throw requestError('Choose a milestone of 5, 10, or 18 bookings.');
    const profiles = await BuddyProfile.find({ completedBookings: Number(milestone) })
      .populate({ path: 'userId', match: { role: 'BUDDY', isActive: true }, select: 'name email role referralCode' })
      .lean();
    return profiles.map((profile) => profile.userId).filter(Boolean);
  }

  return [];
}

async function getRecipients(template, recipientMode, email, milestone) {
  if (recipientMode === 'SINGLE') {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw requestError('Enter a valid account email address.');
    }
    const account = await User.findOne({ email: normalizedEmail, isActive: true })
      .select('name email role referralCode')
      .lean();
    return [account || { email: normalizedEmail, name: '' }];
  }

  if (template.deliveryMode === 'broadcast' && recipientMode === 'ALL') {
    return User.find({ role: template.recipientRole, isActive: true })
      .select('name email role referralCode')
      .lean();
  }

  if (template.deliveryMode === 'triggered' && recipientMode === 'MATCHED') {
    return getTriggeredRecipients(template, milestone);
  }

  throw requestError('Choose a recipient option available for this topic.');
}

export async function sendCampaign({ templateId, recipientMode, email, promoCode, promoExpiry, milestone }) {
  const template = getTemplate(templateId);
  if (!env.officialEmailUser || !env.officialEmailPass) {
    throw requestError('Campaign email is not configured. Add HAANGO_OFFICIAL_USER and HAANGO_OFFICIAL_PASS to the backend environment.', 503);
  }
  if (template.variables?.includes('promoExpiry')) {
    const normalizedExpiry = String(promoExpiry || '');
    const expiryDate = new Date(`${normalizedExpiry}T12:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedExpiry)
      || Number.isNaN(expiryDate.getTime())
      || normalizedExpiry < new Date().toISOString().slice(0, 10)) {
      throw requestError('Choose a promo expiry date that is today or later.');
    }
  }

  const recipients = await getRecipients(template, recipientMode, email, milestone);
  const uniqueRecipients = [...new Map(recipients
    .filter((recipient) => recipient?.email)
    .map((recipient) => [recipient.email.toLowerCase(), recipient])).values()];

  let sent = 0;
  let failed = 0;
  for (const recipient of uniqueRecipients) {
    try {
      await sendAdminCampaignEmail({
        templateId,
        recipient: recipient.email,
        recipientName: recipient.name,
        variables: {
          promoCode: String(promoCode || 'WELCOME100').trim().toUpperCase(),
          promoExpiry,
          milestone: Number(milestone),
          referralCode: recipient.referralCode,
        },
      });
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return { recipientCount: uniqueRecipients.length, sent, failed };
}
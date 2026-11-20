import Booking from '../models/Booking.js';
import BuddyProfile from '../models/BuddyProfile.js';
import User from '../models/User.js';
import EmailUnsubscribe from '../models/EmailUnsubscribe.js';
import AdminEmailList from '../models/AdminEmailList.js';
import {
  completeSavedListCampaignHistory,
  createSavedListCampaignHistory,
} from './adminEmailCampaignHistoryService.js';
import {
  getAdminCampaignTemplates,
  isAdminCampaignSenderConfigured,
  previewAdminCampaignEmail,
  sendAdminCampaignEmail,
} from './emailService.js';
import {
  MAX_BULK_EMAIL_RECIPIENTS,
  parseBulkEmailRecipientDetails,
} from '../utils/emailRecipientList.js';
import { createEmailUnsubscribeToken } from '../utils/emailUnsubscribeToken.js';
import { createCampaignAttributionToken } from '../utils/campaignAttributionToken.js';
import { env } from '../config/environment.js';

const allowedMilestones = new Set([5, 10, 18]);
export const ADMIN_CAMPAIGN_SENDERS = Object.freeze({
  'haangoofficial@gmail.com': 'GMAIL',
  'support@haango.in': 'HOSTINGER',
});

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

function normalizeGmailAlias(email) {
  return String(email || '').trim().toLowerCase().replace(/@googlemail\.com$/, '@gmail.com');
}

function emailLookupVariants(emails) {
  return [...new Set(emails.flatMap((email) => {
    const normalized = normalizeGmailAlias(email);
    return normalized.endsWith('@gmail.com')
      ? [normalized, normalized.replace(/@gmail\.com$/, '@googlemail.com')]
      : [normalized];
  }))];
}

export function previewCampaign({ templateId, promoCode, milestone, creditAmount }) {
  getTemplate(templateId);
  return previewAdminCampaignEmail({ templateId, promoCode, milestone, creditAmount });
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

export async function resolveCampaignRecipients(template, recipientMode, email, milestone, bulkEmails) {
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

  if (recipientMode === 'BULK') {
    return bulkEmails.map((recipientEmail) => ({ email: recipientEmail, name: '' }));
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

export async function getEmailUnsubscribes(page = 1, limit = 50) {
  const filter = { optedOutAt: { $ne: null } };
  const skip = (page - 1) * limit;
  const [unsubscribes, total] = await Promise.all([
    EmailUnsubscribe.find(filter)
      .select('email optedOutAt')
      .sort({ optedOutAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EmailUnsubscribe.countDocuments(filter),
  ]);
  return { unsubscribes, total };
}

export async function sendCampaignToRecipients({
  recipients,
  templateId,
  promoCode,
  promoExpiry,
  milestone,
  creditAmount,
  senderEmail,
  sender = sendAdminCampaignEmail,
}) {
  const uniqueRecipients = [...new Map(recipients
    .filter((recipient) => recipient?.email)
    .map((recipient) => [recipient.email.toLowerCase(), recipient])).values()];

  let sent = 0;
  let failed = 0;
  for (const recipient of uniqueRecipients) {
    try {
      await sender({
        templateId,
        recipient: recipient.email,
        recipientName: recipient.name,
        variables: {
          promoCode: String(promoCode || 'WELCOME100').trim().toUpperCase(),
          promoExpiry,
          milestone: Number(milestone),
          creditAmount,
          referralCode: recipient.referralCode,
          unsubscribeUrl: `${env.clientUrl.replace(/\/$/, '')}/unsubscribe#token=${encodeURIComponent(createEmailUnsubscribeToken(recipient.email))}`,
          campaignAttributionToken: createCampaignAttributionToken(recipient.email),
        },
        senderEmail,
      });
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return { recipientCount: uniqueRecipients.length, sent, failed };
}

export async function sendCampaign({
  templateId,
  recipientMode,
  email,
  recipientEmails,
  promoCode,
  promoExpiry,
  milestone,
  creditAmount,
  senderEmail,
  senderProvider,
  recipientListId,
  sender = sendAdminCampaignEmail,
}) {
  const template = getTemplate(templateId);
  let bulkEmails = null;
  let selectedEmailList = null;
  let skippedInvalidEmails = [];
  let selectedSenderEmail;
  let selectedSenderProvider;
  const legacySender = String(senderProvider || '').trim().toUpperCase();
  if (senderProvider && !['HOSTINGER', 'GMAIL'].includes(legacySender)) {
    throw requestError('Choose haangoofficial@gmail.com or support@haango.in as the sender address.');
  }
  if (senderEmail !== undefined) {
    selectedSenderEmail = String(senderEmail).trim().toLowerCase();
  } else if (legacySender === 'HOSTINGER' && recipientMode === 'BULK') {
    selectedSenderEmail = 'support@haango.in';
  } else {
    selectedSenderEmail = 'haangoofficial@gmail.com';
  }
  selectedSenderProvider = ADMIN_CAMPAIGN_SENDERS[selectedSenderEmail];
  if (!selectedSenderProvider || (senderEmail !== undefined && senderProvider
    && legacySender !== selectedSenderProvider)) {
    throw requestError('Choose haangoofficial@gmail.com or support@haango.in as the sender address.');
  }
  if (recipientMode === 'BULK') {
    if (recipientListId) {
      try {
        selectedEmailList = await AdminEmailList.findById(recipientListId).lean();
      } catch {
        throw requestError('Choose a valid saved recipient list.');
      }
      if (!selectedEmailList || selectedEmailList.isDeleted) throw requestError('The selected recipient list no longer exists.');
      bulkEmails = selectedEmailList.emails;
    } else {
      let parsed;
      try {
        parsed = parseBulkEmailRecipientDetails(recipientEmails);
      } catch (error) {
        throw requestError(error.message);
      }
      bulkEmails = parsed.emails;
      skippedInvalidEmails = parsed.skipped;
    }
    if (bulkEmails.length === 0) throw requestError('Choose a list or enter at least one valid Gmail address.');
    if (bulkEmails.length > MAX_BULK_EMAIL_RECIPIENTS) {
      throw requestError(`Enter no more than ${MAX_BULK_EMAIL_RECIPIENTS} unique Gmail addresses.`);
    }
  }
  if (sender === sendAdminCampaignEmail && !isAdminCampaignSenderConfigured(selectedSenderProvider)) {
    const message = selectedSenderProvider === 'HOSTINGER'
      ? 'Hostinger email is not configured. Configure the Hostinger Mail API or Hostinger SMTP settings in the backend environment.'
      : 'Gmail campaign email is not configured. Configure HAANGO_OFFICIAL_USER and HAANGO_OFFICIAL_PASS in the backend environment.';
    throw requestError(message, 503);
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

  const recipients = await resolveCampaignRecipients(template, recipientMode, email, milestone, bulkEmails);
  let skippedEmails = [];
  let deliveryRecipients = recipients;
  if (recipientMode === 'BULK') {
    const existingUsers = await User.find({ email: { $in: emailLookupVariants(bulkEmails) } })
      .select('email')
      .lean();
    const existingEmails = new Set(existingUsers
      .map((user) => normalizeGmailAlias(user.email))
      .filter(Boolean));
    skippedEmails = bulkEmails.filter((recipientEmail) => existingEmails.has(recipientEmail));
    deliveryRecipients = recipients.filter((recipient) => !existingEmails.has(
      String(recipient.email || '').trim().toLowerCase(),
    ));
  }

  const recipientEmailsToCheck = [...new Set(recipients
    .map((recipient) => String(recipient.email || '').trim().toLowerCase())
    .filter(Boolean))];
  const optedOutRecords = recipientEmailsToCheck.length
    ? await EmailUnsubscribe.find({
      email: { $in: emailLookupVariants(recipientEmailsToCheck) },
      optedOutAt: { $ne: null },
    }).select('email').lean()
    : [];
  const optedOutSet = new Set(optedOutRecords.map((record) => normalizeGmailAlias(record.email)));
  const optedOutEmails = recipientEmailsToCheck.filter((address) => optedOutSet.has(address));
  deliveryRecipients = deliveryRecipients.filter((recipient) => !optedOutSet.has(
    String(recipient.email || '').trim().toLowerCase(),
  ));

  const history = selectedEmailList
    ? await createSavedListCampaignHistory({
      list: selectedEmailList,
      template,
      senderEmail: selectedSenderEmail,
      totalRecipients: bulkEmails.length,
      attemptedRecipients: deliveryRecipients.length,
      skipped: bulkEmails.length - deliveryRecipients.length,
    })
    : null;
  let result;
  try {
    result = await sendCampaignToRecipients({
      recipients: deliveryRecipients,
      templateId,
      promoCode,
      promoExpiry,
      milestone,
      creditAmount,
      senderEmail: selectedSenderEmail,
      sender: (message) => sender({
        ...message,
        senderProvider: selectedSenderProvider,
      }),
    });
  } catch (error) {
    if (history) {
      await completeSavedListCampaignHistory(history._id, {
        sent: 0,
        failed: deliveryRecipients.length,
        status: 'FAILED',
      }).catch(() => {});
    }
    throw error;
  }
  if (history) {
    await completeSavedListCampaignHistory(history._id, {
      sent: result.sent,
      failed: result.failed,
    });
  }
  return {
    ...result,
    skippedEmails,
    optedOutEmails,
    skippedInvalidEmails,
    senderEmail: selectedSenderEmail,
    senderProvider: selectedSenderProvider,
  };
}
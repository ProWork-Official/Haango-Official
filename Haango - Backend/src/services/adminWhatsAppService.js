import User from '../models/User.js';
import { env } from '../config/environment.js';
import { getWhatsAppCampaignTemplates } from './whatsappCampaignTemplates.js';

function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `${env.whatsappDefaultCountryCode}${digits}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : '';
}

async function getEligibleRecipients() {
  const users = await User.find({
    role: { $in: ['CUSTOMER', 'BUDDY'] },
    isActive: true,
    whatsappMarketingOptIn: true,
    phone: { $exists: true, $ne: '' },
  }).select('phone').lean();

  const recipients = new Map();
  let invalidPhoneCount = 0;
  for (const user of users) {
    const phone = normalizePhone(user.phone);
    if (!phone) {
      invalidPhoneCount += 1;
      continue;
    }
    recipients.set(phone, phone);
  }
  return { recipients: [...recipients.keys()], invalidPhoneCount };
}

export async function getCampaignStatus() {
  const [audience, registeredCount] = await Promise.all([
    getEligibleRecipients(),
    User.countDocuments({ role: { $in: ['CUSTOMER', 'BUDDY'] }, isActive: true }),
  ]);
  return {
    templates: getWhatsAppCampaignTemplates(),
    registeredCount,
    eligibleRecipientCount: audience.recipients.length,
    excludedRecipientCount: Math.max(0, registeredCount - audience.recipients.length),
    invalidPhoneCount: audience.invalidPhoneCount,
    defaultCountryCode: env.whatsappDefaultCountryCode,
  };
}

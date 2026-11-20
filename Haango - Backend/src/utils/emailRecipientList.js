const EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

export const MAX_BULK_EMAIL_RECIPIENTS = 100;
const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

function isValidEmailAddress(value) {
  if (value.length > 254) return false;
  const [localPart, domain] = value.split('@');
  return Boolean(
    localPart
    && localPart.length <= 64
    && !localPart.startsWith('.')
    && !localPart.endsWith('.')
    && !localPart.includes('..')
    && domain
    && EMAIL_PATTERN.test(value),
  );
}

function getEntries(input) {
  const entries = typeof input === 'string'
    ? input.split(/[,\n;\r\t]+/)
    : Array.isArray(input) ? input : null;

  if (!entries) throw new Error('Enter email addresses, one per line.');
  return entries;
}

export function parseBulkEmailRecipientDetails(input) {
  const emails = [];
  const seen = new Set();
  const skipped = [];

  getEntries(input).forEach((entry, index) => {
    if (typeof entry !== 'string') {
      skipped.push({ value: String(entry ?? ''), reason: 'Invalid email address.' });
      return;
    }
    const original = entry.trim().replace(/^["']|["']$/g, '').toLowerCase();
    if (!original) return;
    if (!isValidEmailAddress(original)) {
      skipped.push({ value: original, reason: 'Invalid email address.' });
      return;
    }
    const domain = original.slice(original.lastIndexOf('@') + 1);
    if (!GMAIL_DOMAINS.has(domain)) {
      skipped.push({ value: original, reason: 'Not a Gmail address.' });
      return;
    }
    const email = `${original.slice(0, original.lastIndexOf('@'))}@gmail.com`;
    if (!seen.has(email)) {
      seen.add(email);
      emails.push(email);
    }
  });

  return { emails, skipped };
}

export function parseBulkEmailRecipients(input) {
  const { emails } = parseBulkEmailRecipientDetails(input);
  if (emails.length === 0) throw new Error('Enter at least one valid Gmail address.');
  if (emails.length > MAX_BULK_EMAIL_RECIPIENTS) {
    throw new Error(`Enter no more than ${MAX_BULK_EMAIL_RECIPIENTS} unique Gmail addresses.`);
  }
  return emails;
}

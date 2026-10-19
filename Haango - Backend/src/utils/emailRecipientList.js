const EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

export const MAX_BULK_EMAIL_RECIPIENTS = 100;

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

export function parseBulkEmailRecipients(input) {
  const entries = typeof input === 'string'
    ? input.split(/\r?\n/)
    : Array.isArray(input) ? input : null;

  if (!entries) throw new Error('Enter email addresses, one per line.');

  const emails = [];
  const seen = new Set();

  entries.forEach((entry, index) => {
    if (typeof entry !== 'string') {
      throw new Error(`Invalid email address on line ${index + 1}.`);
    }
    const email = entry.trim().toLowerCase();
    if (!email) return;
    if (!isValidEmailAddress(email)) {
      throw new Error(`Invalid email address on line ${index + 1}.`);
    }
    if (!seen.has(email)) {
      seen.add(email);
      emails.push(email);
    }
  });

  if (emails.length === 0) throw new Error('Enter at least one valid email address.');
  if (emails.length > MAX_BULK_EMAIL_RECIPIENTS) {
    throw new Error(`Enter no more than ${MAX_BULK_EMAIL_RECIPIENTS} unique email addresses.`);
  }

  return emails;
}

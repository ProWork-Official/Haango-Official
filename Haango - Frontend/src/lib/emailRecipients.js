const EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

export const MAX_BULK_EMAIL_RECIPIENTS = 100;

function splitRecipientEntries(input) {
  return input.split(/[,\n;\r\t]+/);
}

function isValidEmail(email) {
  const [localPart, domain] = email.split('@');
  return email.length <= 254
    && localPart?.length <= 64
    && !localPart.startsWith('.')
    && !localPart.endsWith('.')
    && !localPart.includes('..')
    && Boolean(domain)
    && EMAIL_PATTERN.test(email);
}

export function parseBulkEmailRecipients(input) {
  const emails = [];
  const seen = new Set();
  const skipped = [];

  const entries = splitRecipientEntries(input);
  entries.forEach((entry) => {
    const original = entry.trim().replace(/^["']|["']$/g, '').toLowerCase();
    const email = original;
    if (!original) return;

    if (!isValidEmail(email)) {
      skipped.push({ value: original, reason: 'Invalid email address.' });
      return;
    }
    const domain = email.slice(email.lastIndexOf('@') + 1);
    if (!['gmail.com', 'googlemail.com'].includes(domain)) {
      skipped.push({ value: original, reason: 'Not a Gmail address.' });
      return;
    }
    const normalized = `${email.slice(0, email.lastIndexOf('@'))}@gmail.com`;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      emails.push(normalized);
    }
  });

  return {
    rawCount: entries.filter((entry) => entry.trim()).length,
    emails,
    skipped,
    error: emails.length === 0
      ? 'Enter at least one valid Gmail address.'
      : emails.length > MAX_BULK_EMAIL_RECIPIENTS
        ? `Enter no more than ${MAX_BULK_EMAIL_RECIPIENTS} unique Gmail addresses.`
        : '',
  };
}

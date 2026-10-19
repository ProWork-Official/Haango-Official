const EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

export const MAX_BULK_EMAIL_RECIPIENTS = 100;

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
  let invalidLine = -1;

  input.split(/\r?\n/).forEach((entry, index) => {
    const email = entry.trim().toLowerCase();
    if (!email) return;

    if (!isValidEmail(email)) {
      if (invalidLine === -1) invalidLine = index + 1;
      return;
    }
    if (!seen.has(email)) {
      seen.add(email);
      emails.push(email);
    }
  });

  return {
    emails,
    error: invalidLine !== -1
      ? `Invalid email address on line ${invalidLine}.`
      : emails.length === 0
        ? 'Enter at least one valid email address.'
        : emails.length > MAX_BULK_EMAIL_RECIPIENTS
          ? `Enter no more than ${MAX_BULK_EMAIL_RECIPIENTS} unique email addresses.`
          : '',
  };
}

import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/environment.js';

const TOKEN_VERSION = 'v1';
const TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_TOKEN_LENGTH = 2048;
const encryptionKey = createHmac('sha256', env.emailUnsubscribeSecret)
  .update('haango:campaign-attribution:encryption:v1')
  .digest();
const signingKey = createHmac('sha256', env.emailUnsubscribeSecret)
  .update('haango:campaign-attribution:signature:v1')
  .digest();

function signatureFor(payload) {
  return createHmac('sha256', signingKey).update(payload).digest();
}

export function createCampaignAttributionToken(email, now = Date.now()) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new TypeError('A valid recipient email is required for campaign attribution.');
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({
    email: normalizedEmail,
    expiresAt: now + TOKEN_TTL_MS,
  }), 'utf8'), cipher.final()]);
  const payload = [
    TOKEN_VERSION,
    iv.toString('base64url'),
    encrypted.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
  ].join('.');
  return `${payload}.${signatureFor(payload).toString('base64url')}`;
}

export function getEmailFromCampaignAttributionToken(token, now = Date.now()) {
  const rawToken = String(token || '');
  if (rawToken.length > MAX_TOKEN_LENGTH) return null;

  const parts = rawToken.split('.');
  if (parts.length !== 5 || parts[0] !== TOKEN_VERSION) return null;
  const [version, encodedIv, encodedCiphertext, encodedTag, encodedSignature] = parts;
  if (![encodedIv, encodedCiphertext, encodedTag, encodedSignature].every((part) => /^[A-Za-z0-9_-]+$/.test(part))) {
    return null;
  }

  const payload = [version, encodedIv, encodedCiphertext, encodedTag].join('.');
  const expectedSignature = signatureFor(payload);
  const receivedSignature = Buffer.from(encodedSignature, 'base64url');
  if (expectedSignature.length !== receivedSignature.length || !timingSafeEqual(expectedSignature, receivedSignature)) {
    return null;
  }

  try {
    const iv = Buffer.from(encodedIv, 'base64url');
    const ciphertext = Buffer.from(encodedCiphertext, 'base64url');
    const tag = Buffer.from(encodedTag, 'base64url');
    if (iv.length !== 12 || tag.length !== 16) return null;

    const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    const { email, expiresAt } = JSON.parse(plaintext);
    if (
      typeof email !== 'string'
      || email !== email.trim().toLowerCase()
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || !Number.isFinite(expiresAt)
      || expiresAt <= now
    ) {
      return null;
    }
    return email;
  } catch {
    return null;
  }
}

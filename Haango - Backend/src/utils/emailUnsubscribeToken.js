import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/environment.js';

function signatureFor(email) {
  return createHmac('sha256', env.emailUnsubscribeSecret)
    .update(email)
    .digest('base64url');
}

export function createEmailUnsubscribeToken(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const encodedEmail = Buffer.from(normalizedEmail).toString('base64url');
  return `${encodedEmail}.${signatureFor(normalizedEmail)}`;
}

export function getEmailFromUnsubscribeToken(token) {
  const rawToken = String(token || '');
  if (rawToken.length > 512) return null;
  const [encodedEmail, receivedSignature, extra] = rawToken.split('.');
  if (!encodedEmail || !receivedSignature || extra !== undefined) return null;

  let email;
  try {
    email = Buffer.from(encodedEmail, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email !== email.toLowerCase()) return null;

  const expected = Buffer.from(signatureFor(email));
  const received = Buffer.from(receivedSignature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  return email;
}

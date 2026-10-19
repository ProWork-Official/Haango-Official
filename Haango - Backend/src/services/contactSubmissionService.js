import { randomUUID } from 'node:crypto';
import ContactSubmission from '../models/ContactSubmission.js';
import { lookupIpLocation } from './ipGeolocationService.js';
import { badRequest } from '../utils/errors.js';

const SUBMISSION_FIELDS = new Set(['action', 'consentConfirmed', 'sessionId', 'contacts']);
const CONTACT_FIELDS = new Set(['name', 'phone']);
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const MAX_CONTACTS = 1000;

function reject(message, code) {
  throw badRequest(message, code);
}

export function validateContactSubmissionPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    reject('A JSON object is required.', 'INVALID_CONTACT_SUBMISSION');
  }

  if (Object.keys(payload).some((field) => !SUBMISSION_FIELDS.has(field))) {
    reject('Unsupported contact submission field.', 'UNSUPPORTED_FIELD');
  }
  if (payload.action !== 'shared' && payload.action !== 'declined') {
    reject('action must be either shared or declined.', 'INVALID_ACTION');
  }
  if (!Object.hasOwn(payload, 'consentConfirmed')
      || typeof payload.consentConfirmed !== 'boolean') {
    reject('consentConfirmed must be a boolean.', 'CONSENT_REQUIRED');
  }
  if (payload.action === 'shared' && payload.consentConfirmed !== true) {
    reject('Explicit consent is required to share contacts.', 'CONSENT_REQUIRED');
  }
  if (payload.action === 'declined' && payload.consentConfirmed !== false) {
    reject('Declined submissions must confirm that consent was not given.', 'CONSENT_REQUIRED');
  }

  if (Object.hasOwn(payload, 'sessionId')
      && payload.sessionId !== null
      && typeof payload.sessionId !== 'string') {
    reject('sessionId must be a string or null.', 'INVALID_SESSION_ID');
  }
  if (payload.action === 'shared'
      && typeof payload.sessionId === 'string'
      && !SESSION_ID_PATTERN.test(payload.sessionId)) {
    reject('sessionId must be a 16 to 128 character opaque identifier.', 'INVALID_SESSION_ID');
  }

  if (!Array.isArray(payload.contacts)) {
    reject('contacts must be an array.', 'INVALID_CONTACTS');
  }
  if (payload.action === 'declined') {
    if (payload.contacts.length !== 0) {
      reject('Declined submissions cannot include contacts.', 'INVALID_CONTACTS');
    }
    return { action: payload.action, sessionId: null, contacts: [] };
  }
  if (payload.contacts.length < 1 || payload.contacts.length > MAX_CONTACTS) {
    reject(`Provide between 1 and ${MAX_CONTACTS} contacts.`, 'INVALID_CONTACTS');
  }

  const contacts = payload.contacts.map((contact) => {
    if (!contact || typeof contact !== 'object' || Array.isArray(contact)) {
      reject('Each contact must be an object.', 'INVALID_CONTACT');
    }
    if (Object.keys(contact).some((field) => !CONTACT_FIELDS.has(field))) {
      reject('Unsupported contact field.', 'UNSUPPORTED_FIELD');
    }
    if (typeof contact.name !== 'string') {
      reject('Each contact must have a valid name.', 'INVALID_CONTACT_NAME');
    }
    const name = contact.name.trim();
    if (name.length < 1 || name.length > 100 || CONTROL_CHARACTERS.test(name)) {
      reject('Contact names must be 1 to 100 characters.', 'INVALID_CONTACT_NAME');
    }
    if (typeof contact.phone !== 'string' || !E164_PATTERN.test(contact.phone)) {
      reject('Phone numbers must use plausible E.164 format, including the +country code.', 'INVALID_CONTACT_PHONE');
    }
    return { name, phone: contact.phone };
  });

  return { action: payload.action, sessionId: payload.sessionId, contacts };
}

export async function createContactSubmission(payload, user = null, ipAddress = null, now = new Date()) {
  const validated = validateContactSubmissionPayload(payload);
  const declined = validated.action === 'declined';
  const signedIn = !declined && Boolean(user?._id);
  let location = null;
  if (declined || !signedIn) {
    try {
      location = await lookupIpLocation(ipAddress);
    } catch {
      // A failed approximate IP lookup must not prevent a consent event from being recorded.
    }
  }

  return ContactSubmission.create({
    status: declined ? 'DECLINED' : 'SHARED',
    ...(signedIn ? {
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
    } : {}),
    sessionId: declined ? randomUUID() : validated.sessionId || randomUUID(),
    consentAt: declined ? null : now,
    contacts: validated.contacts,
    location,
  });
}

function toAdminSubmission(submission) {
  const status = submission.status ?? 'SHARED';
  const result = {
    id: String(submission._id),
    status,
    createdAt: submission.createdAt,
    location: submission.location ?? null,
  };
  if (status === 'SHARED') {
    result.sessionId = submission.sessionId;
    result.contacts = submission.contacts;
    if (submission.userId) {
      result.userName = submission.userName ?? null;
      result.userEmail = submission.userEmail ?? null;
    }
  }
  return result;
}

export async function listContactSubmissions(page = 1, limit = 20) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
  const skip = (safePage - 1) * safeLimit;
  const [submissions, total] = await Promise.all([
    ContactSubmission.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    ContactSubmission.countDocuments({}),
  ]);

  return { submissions: submissions.map(toAdminSubmission), total };
}

import test from 'node:test';
import assert from 'node:assert/strict';

import ContactSubmission from '../src/models/ContactSubmission.js';
import {
  createContactSubmission,
  listContactSubmissions,
  validateContactSubmissionPayload,
} from '../src/services/contactSubmissionService.js';

const validPayload = {
  action: 'shared',
  consentConfirmed: true,
  sessionId: 'session_0123456789abcdef',
  contacts: [{ name: '  Alex Example  ', phone: '+14155552671' }],
};

test('shared contact validation requires consent, 1-1000 contacts, and exact supported fields', () => {
  assert.deepEqual(validateContactSubmissionPayload(validPayload), {
    action: 'shared',
    sessionId: validPayload.sessionId,
    contacts: [{ name: 'Alex Example', phone: '+14155552671' }],
  });

  for (const payload of [
    { ...validPayload, consentConfirmed: false },
    { ...validPayload, action: 'unknown' },
    { ...validPayload, extra: 'not allowed' },
    { ...validPayload, userId: 'client-supplied-user-id' },
    { ...validPayload, contacts: [] },
    { ...validPayload, contacts: Array.from({ length: 1001 }, () => validPayload.contacts[0]) },
    { ...validPayload, contacts: [{ name: ' ', phone: '+14155552671' }] },
    { ...validPayload, contacts: [{ name: 'Alex', phone: '4155552671' }] },
    { ...validPayload, contacts: [{ name: 'Alex', phone: '+00000000000' }] },
    { ...validPayload, contacts: [{ ...validPayload.contacts[0], email: 'not-supported@example.com' }] },
  ]) {
    assert.throws(() => validateContactSubmissionPayload(payload), (error) => error.statusCode === 400);
  }

  const maxContacts = Array.from({ length: 1000 }, (_, index) => ({
    name: `Contact ${index}`,
    phone: '+14155552671',
  }));
  assert.equal(validateContactSubmissionPayload({ ...validPayload, contacts: maxContacts }).contacts.length, 1000);
});

test('declined contact validation requires false consent and no contacts', () => {
  assert.deepEqual(validateContactSubmissionPayload({
    action: 'declined',
    consentConfirmed: false,
    contacts: [],
  }), {
    action: 'declined',
    sessionId: null,
    contacts: [],
  });

  for (const payload of [
    { action: 'declined', consentConfirmed: true, contacts: [] },
    { action: 'declined', consentConfirmed: false, contacts: [validPayload.contacts[0]] },
    { action: 'declined', consentConfirmed: false },
  ]) {
    assert.throws(() => validateContactSubmissionPayload(payload), (error) => error.statusCode === 400);
  }
});

test('creation derives signed-in identity from req.user and records server consent time', async (t) => {
  let createdData;
  t.mock.method(ContactSubmission, 'create', async (data) => {
    createdData = data;
    return { ...data, _id: 'submission-id', createdAt: data.consentAt };
  });

  const consentAt = new Date('2026-10-01T12:00:00.000Z');
  await createContactSubmission(validPayload, {
    _id: 'authenticated-user-id',
    name: 'Authenticated Name',
    email: 'authenticated@example.com',
  }, null, consentAt).then((submission) => {
    assert.equal(submission._id, 'submission-id');
  });

  assert.equal(createdData.status, 'SHARED');
  assert.equal(createdData.userId, 'authenticated-user-id');
  assert.equal(createdData.userName, 'Authenticated Name');
  assert.equal(createdData.userEmail, 'authenticated@example.com');
  assert.equal(createdData.sessionId, validPayload.sessionId);
  assert.equal(createdData.consentAt, consentAt);
  assert.deepEqual(createdData.contacts, [{ name: 'Alex Example', phone: '+14155552671' }]);
  assert.equal(createdData.location, null);
});

test('guest submissions get a server-generated opaque session ID when none is supplied', async (t) => {
  let createdData;
  t.mock.method(ContactSubmission, 'create', async (data) => {
    createdData = data;
    return data;
  });

  const payloadWithoutSessionId = { ...validPayload };
  delete payloadWithoutSessionId.sessionId;
  await createContactSubmission(payloadWithoutSessionId, null, null);

  assert.equal(createdData.status, 'SHARED');
  assert.match(createdData.sessionId, /^[0-9a-f-]{36}$/i);
  assert.equal(Object.hasOwn(createdData, 'userId'), false);
  assert.equal(Object.hasOwn(createdData, 'userName'), false);
  assert.equal(Object.hasOwn(createdData, 'userEmail'), false);
  assert.ok(createdData.consentAt instanceof Date);
});

test('declined submissions are anonymous and receive a generated session ID', async (t) => {
  let createdData;
  t.mock.method(ContactSubmission, 'create', async (data) => {
    createdData = data;
    return data;
  });

  await createContactSubmission({
    action: 'declined',
    consentConfirmed: false,
    contacts: [],
  }, {
    _id: 'authenticated-user-id',
    name: 'Authenticated Name',
    email: 'authenticated@example.com',
  }, null, new Date('2026-10-01T12:00:00.000Z'));

  assert.equal(createdData.status, 'DECLINED');
  assert.match(createdData.sessionId, /^[0-9a-f-]{36}$/i);
  assert.equal(Object.hasOwn(createdData, 'userId'), false);
  assert.equal(Object.hasOwn(createdData, 'userName'), false);
  assert.equal(Object.hasOwn(createdData, 'userEmail'), false);
  assert.deepEqual(createdData.contacts, []);
  assert.equal(createdData.consentAt, null);
});

test('admin listing sorts newest-first, paginates, and returns the requested public fields', async (t) => {
  const calls = {};
  const rows = [{
    _id: 'submission-id',
    status: 'SHARED',
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
    userId: null,
    sessionId: 'opaque-session-id',
    contacts: [{ name: 'Alex', phone: '+14155552671' }],
    consentAt: new Date('2026-10-01T12:00:00.000Z'),
    location: { city: 'Mumbai', region: 'Maharashtra', country: 'India' },
  }];

  t.mock.method(ContactSubmission, 'find', (filter) => {
    calls.filter = filter;
    return {
      sort(value) {
        calls.sort = value;
        return this;
      },
      skip(value) {
        calls.skip = value;
        return this;
      },
      limit(value) {
        calls.limit = value;
        return this;
      },
      lean: async () => rows,
    };
  });
  t.mock.method(ContactSubmission, 'countDocuments', async (filter) => {
    calls.countFilter = filter;
    return 21;
  });

  const result = await listContactSubmissions(2, 200);

  assert.deepEqual(calls, {
    filter: {},
    sort: { createdAt: -1 },
    skip: 100,
    limit: 100,
    countFilter: {},
  });
  assert.equal(result.total, 21);
  assert.deepEqual(result.submissions, [{
    id: 'submission-id',
    status: 'SHARED',
    createdAt: rows[0].createdAt,
    location: rows[0].location,
    sessionId: 'opaque-session-id',
    contacts: rows[0].contacts,
  }]);
});

test('admin listing excludes declined session and identity metadata', async (t) => {
  t.mock.method(ContactSubmission, 'find', () => ({
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    lean: async () => [{
      _id: 'declined-id',
      status: 'DECLINED',
      createdAt: new Date('2026-10-01T12:00:00.000Z'),
      userId: null,
      userName: 'must-not-be-returned',
      userEmail: 'must-not-be-returned@example.com',
      sessionId: 'opaque-session-id',
      contacts: [],
      location: { city: 'Mumbai', region: 'Maharashtra', country: 'India' },
    }],
  }));
  t.mock.method(ContactSubmission, 'countDocuments', async () => 1);
  const result = await listContactSubmissions(1, 200);
  assert.deepEqual(result.submissions[0], {
    id: 'declined-id',
    status: 'DECLINED',
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
    location: { city: 'Mumbai', region: 'Maharashtra', country: 'India' },
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import User from '../src/models/User.js';
import EmailUnsubscribe from '../src/models/EmailUnsubscribe.js';
import { sendCampaign } from '../src/services/adminEmailService.js';
import {
  isAdminCampaignSenderConfigured,
} from '../src/services/emailService.js';
import {
  parseBulkEmailRecipientDetails,
  parseBulkEmailRecipients,
} from '../src/utils/emailRecipientList.js';

test('bulk email parsing normalizes Gmail aliases, skips blanks, and deduplicates', () => {
  assert.deepEqual(
    parseBulkEmailRecipients('  Person@Googlemail.com  \r\n\nother@gmail.com\nperson@gmail.COM'),
    ['person@gmail.com', 'other@gmail.com'],
  );
});

test('bulk email parsing skips malformed and non-Gmail entries with reasons', () => {
  const parsed = parseBulkEmailRecipientDetails('valid@gmail.com\nnot-an-email\nuser@example.org');
  assert.deepEqual(parsed.emails, ['valid@gmail.com']);
  assert.deepEqual(parsed.skipped, [
    { value: 'not-an-email', reason: 'Invalid email address.' },
    { value: 'user@example.org', reason: 'Not a Gmail address.' },
  ]);
});

test('bulk email parsing requires at least one address and caps unique recipients at 100', () => {
  assert.throws(() => parseBulkEmailRecipients('\n  \r\n'), /Enter at least one valid Gmail address/);
  assert.equal(parseBulkEmailRecipients(Array.from({ length: 100 }, (_, index) => `person${index}@gmail.com`)).length, 100);
  assert.throws(
    () => parseBulkEmailRecipients(Array.from({ length: 101 }, (_, index) => `person${index}@gmail.com`)),
    /no more than 100 unique Gmail addresses/,
  );
});

test('bulk send skips invalid addresses and requires a valid recipient before delivery', async () => {
  await assert.rejects(
    sendCampaign({
      templateId: 'customer_signup',
      recipientMode: 'BULK',
      recipientEmails: ['not-an-email'],
    }),
    (error) => error.statusCode === 400 && /at least one valid Gmail address/.test(error.message),
  );
});

test('bulk mode skips existing Haango users and sends only remaining normalized addresses', async (t) => {
  t.mock.method(EmailUnsubscribe, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  let accountLookups = 0;
  let lookupFilter;
  t.mock.method(User, 'find', (filter) => {
    lookupFilter = filter;
    return {
      select: () => ({
        lean: async () => {
          accountLookups += 1;
          return [{ email: 'outside@gmail.com' }];
        },
      }),
    };
  });

  const sentTo = [];
  const result = await sendCampaign({
    templateId: 'customer_signup',
    recipientMode: 'BULK',
    recipientEmails: 'Outside@Gmail.com, second@gmail.com\nnot-an-address\nsomeone@example.org',
    sender: async ({ recipient }) => sentTo.push(recipient),
  });

  assert.deepEqual(sentTo, ['second@gmail.com']);
  assert.equal(accountLookups, 1);
  assert.deepEqual(lookupFilter, {
    email: { $in: [
      'outside@gmail.com',
      'outside@googlemail.com',
      'second@gmail.com',
      'second@googlemail.com',
    ] },
  });
  assert.deepEqual(
    { recipientCount: result.recipientCount, sent: result.sent, failed: result.failed, skippedEmails: result.skippedEmails },
    { recipientCount: 1, sent: 1, failed: 0, skippedEmails: ['outside@gmail.com'] },
  );
  assert.deepEqual(result.skippedEmails, ['outside@gmail.com']);
  assert.deepEqual(result.skippedInvalidEmails, [
    { value: 'not-an-address', reason: 'Invalid email address.' },
    { value: 'someone@example.org', reason: 'Not a Gmail address.' },
  ]);
});

test('bulk mode reports existing addresses and sends nothing when every address belongs to a user', async (t) => {
  t.mock.method(EmailUnsubscribe, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  t.mock.method(User, 'find', () => ({
    select: () => ({
      lean: async () => [
        { email: 'first@gmail.com' },
        { email: 'second@gmail.com' },
      ],
    }),
  }));
  let sendCount = 0;

  const result = await sendCampaign({
    templateId: 'customer_signup',
    recipientMode: 'BULK',
    recipientEmails: ['first@gmail.com', 'second@gmail.com'],
    sender: async () => { sendCount += 1; },
  });

  assert.equal(sendCount, 0);
  assert.equal(result.recipientCount, 0);
  assert.equal(result.sent, 0);
  assert.equal(result.failed, 0);
  assert.deepEqual(result.skippedEmails, ['first@gmail.com', 'second@gmail.com']);
});

test('bulk mode skips registered addresses and opted-out addresses without disturbing deduplication', async (t) => {
  t.mock.method(User, 'find', () => ({
    select: () => ({
      lean: async () => [{ email: 'registered@gmail.com' }],
    }),
  }));
  t.mock.method(EmailUnsubscribe, 'find', () => ({
    select: () => ({
      lean: async () => [{ email: 'optedout@gmail.com' }],
    }),
  }));
  const sentTo = [];

  const result = await sendCampaign({
    templateId: 'customer_signup',
    recipientMode: 'BULK',
    recipientEmails: [
      'registered@gmail.com',
      'optedout@gmail.com',
      'OPTEDOUT@googlemail.com',
      'new@gmail.com',
    ],
    sender: async ({ recipient }) => sentTo.push(recipient),
  });

  assert.deepEqual(sentTo, ['new@gmail.com']);
  assert.deepEqual(result.skippedEmails, ['registered@gmail.com']);
  assert.deepEqual(result.optedOutEmails, ['optedout@gmail.com']);
  assert.equal(result.recipientCount, 1);
});

test('campaign sender configuration distinguishes Hostinger API, Hostinger SMTP, and Gmail', () => {
  assert.equal(isAdminCampaignSenderConfigured('GMAIL', {
    officialEmailUser: 'haangoofficial@gmail.com',
    officialEmailPass: 'configured',
  }), true);
  assert.equal(isAdminCampaignSenderConfigured('GMAIL', {
    officialEmailUser: 'haangoofficial@gmail.com',
    officialEmailPass: '',
  }), false);
  assert.equal(isAdminCampaignSenderConfigured('HOSTINGER', {
    hostingerMailApiToken: 'configured',
    hostingerMailbox: 'support@haango.in',
    hostingerMailboxConfigured: true,
  }), true);
  assert.equal(isAdminCampaignSenderConfigured('HOSTINGER', {
    hostingerMailApiToken: 'PASTE_HOSTINGER_MAIL_API_TOKEN_HERE',
    hostingerMailbox: 'support@haango.in',
    hostingerMailboxConfigured: true,
  }), false);
  assert.equal(isAdminCampaignSenderConfigured('HOSTINGER', {
    smtpConfigured: true,
    smtpHost: 'smtp.hostinger.com',
    smtpUser: 'support@haango.in',
    smtpPass: 'configured',
    hostingerSmtpFrom: 'support@haango.in',
  }), true);
  assert.equal(isAdminCampaignSenderConfigured('HOSTINGER', {
    smtpConfigured: true,
    smtpHost: 'smtp.gmail.com',
    smtpUser: 'official@example.com',
    smtpPass: 'configured',
    hostingerSmtpFrom: 'official@example.com',
  }), false);
  assert.equal(isAdminCampaignSenderConfigured('UNKNOWN', {}), false);
});

test('bulk campaign passes the selected provider to the sender seam and reports it', async (t) => {
  t.mock.method(EmailUnsubscribe, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  t.mock.method(User, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  const deliveredBy = [];
  const result = await sendCampaign({
    templateId: 'customer_signup',
    recipientMode: 'BULK',
    recipientEmails: ['first@gmail.com', 'second@gmail.com'],
    senderProvider: 'HOSTINGER',
    sender: async ({ senderProvider }) => deliveredBy.push(senderProvider),
  });

  assert.deepEqual(deliveredBy, ['HOSTINGER', 'HOSTINGER']);
  assert.equal(result.senderProvider, 'HOSTINGER');
  assert.deepEqual(
    { recipientCount: result.recipientCount, sent: result.sent, failed: result.failed },
    { recipientCount: 2, sent: 2, failed: 0 },
  );
});

test('bulk campaign without a provider keeps the legacy Gmail default', async (t) => {
  t.mock.method(EmailUnsubscribe, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  t.mock.method(User, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  const deliveredBy = [];
  const result = await sendCampaign({
    templateId: 'customer_signup',
    recipientMode: 'BULK',
    recipientEmails: ['person@gmail.com'],
    sender: async ({ senderProvider }) => deliveredBy.push(senderProvider),
  });

  assert.deepEqual(deliveredBy, ['GMAIL']);
  assert.equal(result.senderProvider, 'GMAIL');
});

test('bulk campaign rejects unsupported sender choices as a client error', async () => {
  await assert.rejects(
    sendCampaign({
      templateId: 'customer_signup',
      recipientMode: 'BULK',
      recipientEmails: ['person@example.com'],
      senderProvider: 'OTHER',
      sender: async () => {},
    }),
    (error) => error.statusCode === 400 && /Choose haangoofficial@gmail.com or support@haango.in/.test(error.message),
  );
});

test('non-bulk recipient modes retain the Gmail default and do not use bulk provider selection', async (t) => {
  t.mock.method(EmailUnsubscribe, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  t.mock.method(User, 'findOne', () => ({
    select: () => ({ lean: async () => null }),
  }));
  const providers = [];
  const result = await sendCampaign({
    templateId: 'customer_signup',
    recipientMode: 'SINGLE',
    email: 'person@example.com',
    senderProvider: 'HOSTINGER',
    sender: async ({ senderProvider }) => providers.push(senderProvider),
  });

  assert.deepEqual(providers, ['GMAIL']);
  assert.equal(result.senderProvider, 'GMAIL');
  assert.equal(result.senderEmail, 'haangoofficial@gmail.com');
});

test('sender address may be selected for any recipient mode and is validated server-side', async (t) => {
  t.mock.method(EmailUnsubscribe, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  t.mock.method(User, 'findOne', () => ({
    select: () => ({ lean: async () => null }),
  }));
  let message;
  const result = await sendCampaign({
    templateId: 'customer_signup',
    recipientMode: 'SINGLE',
    email: 'person@example.com',
    senderEmail: 'support@haango.in',
    sender: async (value) => { message = value; },
  });

  assert.equal(message.senderEmail, 'support@haango.in');
  assert.equal(message.senderProvider, 'HOSTINGER');
  assert.equal(result.senderEmail, 'support@haango.in');
  await assert.rejects(
    sendCampaign({
      templateId: 'customer_signup',
      recipientMode: 'SINGLE',
      email: 'person@example.com',
      senderEmail: 'not-a-haango-address@example.com',
      sender: async () => {},
    }),
    (error) => error.statusCode === 400 && /Choose haangoofficial@gmail.com or support@haango.in/.test(error.message),
  );
});

test('single-recipient sends also honor a persisted opt-out', async (t) => {
  t.mock.method(User, 'findOne', () => ({
    select: () => ({ lean: async () => null }),
  }));
  t.mock.method(EmailUnsubscribe, 'find', () => ({
    select: () => ({
      lean: async () => [{ email: 'person@example.com' }],
    }),
  }));
  let sendCount = 0;
  const result = await sendCampaign({
    templateId: 'customer_signup',
    recipientMode: 'SINGLE',
    email: 'person@example.com',
    senderEmail: 'support@haango.in',
    sender: async () => { sendCount += 1; },
  });

  assert.equal(sendCount, 0);
  assert.equal(result.recipientCount, 0);
  assert.deepEqual(result.optedOutEmails, ['person@example.com']);
  assert.equal(result.senderEmail, 'support@haango.in');
});

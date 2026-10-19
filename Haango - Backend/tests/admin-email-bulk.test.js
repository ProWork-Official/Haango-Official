import test from 'node:test';
import assert from 'node:assert/strict';
import User from '../src/models/User.js';
import { sendCampaign } from '../src/services/adminEmailService.js';
import {
  isAdminCampaignSenderConfigured,
} from '../src/services/emailService.js';
import { parseBulkEmailRecipients } from '../src/utils/emailRecipientList.js';

test('bulk email parsing trims, lowercases, skips blank lines, and deduplicates', () => {
  assert.deepEqual(
    parseBulkEmailRecipients('  Person@Example.com  \r\n\nother@example.org\nperson@example.COM'),
    ['person@example.com', 'other@example.org'],
  );
});

test('bulk email parsing rejects an invalid address with its line number', () => {
  assert.throws(
    () => parseBulkEmailRecipients('valid@example.com\nnot-an-email'),
    /Invalid email address on line 2/,
  );
});

test('bulk email parsing requires at least one address and caps unique recipients at 100', () => {
  assert.throws(() => parseBulkEmailRecipients('\n  \r\n'), /Enter at least one valid email address/);
  assert.equal(parseBulkEmailRecipients(Array.from({ length: 100 }, (_, index) => `person${index}@example.com`)).length, 100);
  assert.throws(
    () => parseBulkEmailRecipients(Array.from({ length: 101 }, (_, index) => `person${index}@example.com`)),
    /no more than 100 unique email addresses/,
  );
});

test('bulk send rejects invalid addresses as a client error before checking delivery configuration', async () => {
  await assert.rejects(
    sendCampaign({
      templateId: 'customer_signup',
      recipientMode: 'BULK',
      recipientEmails: ['not-an-email'],
    }),
    (error) => error.statusCode === 400 && /Invalid email address on line 1/.test(error.message),
  );
});

test('bulk mode skips existing Haango users and sends only remaining normalized addresses', async (t) => {
  let accountLookups = 0;
  let lookupFilter;
  t.mock.method(User, 'find', (filter) => {
    lookupFilter = filter;
    return {
      select: () => ({
        lean: async () => {
          accountLookups += 1;
          return [{ email: 'outside@example.com' }];
        },
      }),
    };
  });

  const sentTo = [];
  const result = await sendCampaign({
    templateId: 'customer_signup',
    recipientMode: 'BULK',
    recipientEmails: ['Outside@Example.com', 'second@example.net'],
    sender: async ({ recipient }) => sentTo.push(recipient),
  });

  assert.deepEqual(sentTo, ['second@example.net']);
  assert.equal(accountLookups, 1);
  assert.deepEqual(lookupFilter, {
    email: { $in: ['outside@example.com', 'second@example.net'] },
  });
  assert.deepEqual(
    { recipientCount: result.recipientCount, sent: result.sent, failed: result.failed, skippedEmails: result.skippedEmails },
    { recipientCount: 1, sent: 1, failed: 0, skippedEmails: ['outside@example.com'] },
  );
  assert.deepEqual(result.skippedEmails, ['outside@example.com']);
});

test('bulk mode reports existing addresses and sends nothing when every address belongs to a user', async (t) => {
  t.mock.method(User, 'find', () => ({
    select: () => ({
      lean: async () => [
        { email: 'first@example.com' },
        { email: 'second@example.net' },
      ],
    }),
  }));
  let sendCount = 0;

  const result = await sendCampaign({
    templateId: 'customer_signup',
    recipientMode: 'BULK',
    recipientEmails: ['first@example.com', 'second@example.net'],
    sender: async () => { sendCount += 1; },
  });

  assert.equal(sendCount, 0);
  assert.equal(result.recipientCount, 0);
  assert.equal(result.sent, 0);
  assert.equal(result.failed, 0);
  assert.deepEqual(result.skippedEmails, ['first@example.com', 'second@example.net']);
});

test('campaign sender configuration distinguishes Hostinger API, Hostinger SMTP, and Gmail', () => {
  assert.equal(isAdminCampaignSenderConfigured('GMAIL', {
    officialEmailUser: 'official@example.com',
    officialEmailPass: 'configured',
  }), true);
  assert.equal(isAdminCampaignSenderConfigured('GMAIL', {
    officialEmailUser: 'official@example.com',
    officialEmailPass: '',
  }), false);
  assert.equal(isAdminCampaignSenderConfigured('HOSTINGER', {
    hostingerMailApiToken: 'configured',
    hostingerMailbox: 'support@example.com',
    hostingerMailboxConfigured: true,
  }), true);
  assert.equal(isAdminCampaignSenderConfigured('HOSTINGER', {
    hostingerMailApiToken: 'PASTE_HOSTINGER_MAIL_API_TOKEN_HERE',
    hostingerMailbox: 'support@example.com',
    hostingerMailboxConfigured: true,
  }), false);
  assert.equal(isAdminCampaignSenderConfigured('HOSTINGER', {
    smtpConfigured: true,
    smtpHost: 'smtp.hostinger.com',
    smtpUser: 'support@example.com',
    smtpPass: 'configured',
    hostingerSmtpFrom: 'support@example.com',
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
  t.mock.method(User, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  const deliveredBy = [];
  const result = await sendCampaign({
    templateId: 'customer_signup',
    recipientMode: 'BULK',
    recipientEmails: ['first@example.com', 'second@example.com'],
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
  t.mock.method(User, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  const deliveredBy = [];
  const result = await sendCampaign({
    templateId: 'customer_signup',
    recipientMode: 'BULK',
    recipientEmails: ['person@example.com'],
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
    (error) => error.statusCode === 400 && /Choose Hostinger or Gmail/.test(error.message),
  );
});

test('non-bulk recipient modes retain the Gmail default and do not use bulk provider selection', async (t) => {
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

  assert.deepEqual(providers, [undefined]);
  assert.equal(result.senderProvider, 'GMAIL');
});

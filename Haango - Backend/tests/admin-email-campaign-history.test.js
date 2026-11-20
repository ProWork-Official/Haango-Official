import test from 'node:test';
import assert from 'node:assert/strict';
import AdminEmailCampaignHistory from '../src/models/AdminEmailCampaignHistory.js';
import AdminEmailList from '../src/models/AdminEmailList.js';
import EmailUnsubscribe from '../src/models/EmailUnsubscribe.js';
import User from '../src/models/User.js';
import { sendCampaign } from '../src/services/adminEmailService.js';
import {
  completeSavedListCampaignHistory,
  createSavedListCampaignHistory,
  getCampaignHistory,
} from '../src/services/adminEmailCampaignHistoryService.js';

test('saved-list campaign history snapshots list identity, template, sender, and recipient counts', async (t) => {
  let created;
  t.mock.method(AdminEmailCampaignHistory, 'create', async (record) => {
    created = record;
    return { _id: 'history-entry-1' };
  });

  const list = { _id: 'saved-list-1', listNumber: 7, name: 'October customers' };
  const template = { id: 'customer_signup', title: 'Welcome customers' };
  const attemptedAt = new Date('2026-10-21T04:15:00.000Z');
  const history = await createSavedListCampaignHistory({
    list,
    template,
    senderEmail: 'support@haango.in',
    attemptedAt,
    totalRecipients: 5,
    attemptedRecipients: 3,
    skipped: 2,
  });

  assert.equal(history._id, 'history-entry-1');
  assert.deepEqual(created, {
    listId: 'saved-list-1',
    listNumber: 7,
    listName: 'October customers',
    templateId: 'customer_signup',
    templateTitle: 'Welcome customers',
    senderEmail: 'support@haango.in',
    attemptedAt,
    status: 'PENDING',
    totalRecipients: 5,
    attemptedRecipients: 3,
    skipped: 2,
  });
});

test('saved-list delivery records sender and completes with partial delivery totals', async (t) => {
  t.mock.method(AdminEmailList, 'findById', () => ({
    lean: async () => ({
      _id: 'list-id',
      listNumber: 4,
      name: 'Current custom name',
      emails: ['sent@gmail.com', 'failed@gmail.com'],
    }),
  }));
  t.mock.method(EmailUnsubscribe, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  t.mock.method(User, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  const records = [];
  const updates = [];
  t.mock.method(AdminEmailCampaignHistory, 'create', async (record) => {
    records.push(record);
    return { _id: 'history-id' };
  });
  t.mock.method(AdminEmailCampaignHistory, 'updateOne', async (...args) => updates.push(args));

  const result = await sendCampaign({
    templateId: 'customer_signup',
    recipientMode: 'BULK',
    recipientListId: 'list-id',
    senderEmail: 'support@haango.in',
    sender: async ({ recipient }) => {
      if (recipient === 'failed@gmail.com') throw new Error('delivery failed');
    },
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].listNumber, 4);
  assert.equal(records[0].listName, 'Current custom name');
  assert.equal(records[0].senderEmail, 'support@haango.in');
  assert.equal(records[0].totalRecipients, 2);
  assert.equal(records[0].attemptedRecipients, 2);
  assert.equal(records[0].skipped, 0);
  assert.deepEqual(updates, [[
    { _id: 'history-id' },
    { $set: { sent: 1, failed: 1, status: 'PARTIAL' } },
  ]]);
  assert.equal(result.senderEmail, 'support@haango.in');
});

test('manual bulk campaigns do not appear as saved-list sends', async (t) => {
  t.mock.method(EmailUnsubscribe, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  t.mock.method(User, 'find', () => ({
    select: () => ({ lean: async () => [] }),
  }));
  let historyCount = 0;
  t.mock.method(AdminEmailCampaignHistory, 'create', async () => {
    historyCount += 1;
    return { _id: 'unused' };
  });

  await sendCampaign({
    templateId: 'customer_signup',
    recipientMode: 'BULK',
    recipientEmails: ['person@gmail.com'],
    sender: async () => {},
  });

  assert.equal(historyCount, 0);
});

test('history listing sorts newest first, paginates, and applies supplied local-day UTC bounds', async (t) => {
  const expectedEntries = [{ _id: 'newest' }];
  let receivedFilter;
  let sortOrder;
  let skip;
  let limit;
  t.mock.method(AdminEmailCampaignHistory, 'find', (filter) => {
    receivedFilter = filter;
    return {
      sort: (order) => {
        sortOrder = order;
        return {
          skip: (value) => {
            skip = value;
            return {
              limit: (pageLimit) => {
                limit = pageLimit;
                return { lean: async () => expectedEntries };
              },
            };
          },
        };
      },
    };
  });
  t.mock.method(AdminEmailCampaignHistory, 'countDocuments', async (filter) => {
    assert.deepEqual(filter, receivedFilter);
    return 26;
  });

  const result = await getCampaignHistory({
    page: 2,
    limit: 25,
    date: 'TODAY',
    from: '2026-10-20T18:30:00.000Z',
    to: '2026-10-21T18:30:00.000Z',
  });

  assert.deepEqual(receivedFilter, {
    attemptedAt: {
      $gte: new Date('2026-10-20T18:30:00.000Z'),
      $lt: new Date('2026-10-21T18:30:00.000Z'),
    },
  });
  assert.deepEqual(sortOrder, { attemptedAt: -1, _id: -1 });
  assert.equal(skip, 25);
  assert.equal(limit, 25);
  assert.deepEqual(result, { entries: expectedEntries, total: 26 });
});

test('history filtering accepts Yesterday and All but rejects invalid bounds', async (t) => {
  const filters = [];
  t.mock.method(AdminEmailCampaignHistory, 'find', (filter) => {
    filters.push(filter);
    return {
      sort: () => ({
        skip: () => ({
          limit: () => ({ lean: async () => [] }),
        }),
      }),
    };
  });
  t.mock.method(AdminEmailCampaignHistory, 'countDocuments', async () => 0);

  await getCampaignHistory({
    date: 'YESTERDAY',
    from: '2026-10-19T18:30:00.000Z',
    to: '2026-10-20T18:30:00.000Z',
  });
  await getCampaignHistory({ date: 'ALL' });
  assert.equal(filters[0].attemptedAt.$gte.toISOString(), '2026-10-19T18:30:00.000Z');
  assert.deepEqual(filters[1], {});
  await assert.rejects(
    getCampaignHistory({ date: 'TODAY', from: 'invalid', to: 'also-invalid' }),
    (error) => error.statusCode === 400,
  );
});

test('history finalization preserves delivery counts and explicit failure status', async (t) => {
  let update;
  t.mock.method(AdminEmailCampaignHistory, 'updateOne', async (...args) => { update = args; });

  await completeSavedListCampaignHistory('failed-entry', {
    sent: 0,
    failed: 3,
    status: 'FAILED',
  });

  assert.deepEqual(update, [
    { _id: 'failed-entry' },
    { $set: { sent: 0, failed: 3, status: 'FAILED' } },
  ]);
});

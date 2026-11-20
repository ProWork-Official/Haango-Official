import test from 'node:test';
import assert from 'node:assert/strict';
import AdminEmailList from '../src/models/AdminEmailList.js';
import AdminEmailListAudit from '../src/models/AdminEmailListAudit.js';
import AdminEmailCampaignHistory from '../src/models/AdminEmailCampaignHistory.js';
import EmailUnsubscribe from '../src/models/EmailUnsubscribe.js';
import User from '../src/models/User.js';
import { sendCampaign } from '../src/services/adminEmailService.js';
import {
  createList,
  deleteList,
  removeSignedUpAddress,
  updateList,
} from '../src/services/adminEmailListService.js';

test('creating lists accepts only normalized Gmail addresses and returns ignored entries', async (t) => {
  t.mock.method(AdminEmailList, 'findOne', () => ({
    sort: () => ({ select: () => ({ lean: async () => ({ listNumber: 2 }) }) }),
  }));
  t.mock.method(AdminEmailList, 'create', async (value) => ({ _id: 'saved', ...value }));

  const result = await createList(' Person@Googlemail.com\tbad-address\nother@example.org\nPERSON@gmail.com');
  assert.equal(result.list.name, 'List 3');
  assert.deepEqual(result.list.emails, ['person@gmail.com']);
  assert.deepEqual(result.skipped, [
    { value: 'bad-address', reason: 'Invalid email address.' },
    { value: 'other@example.org', reason: 'Not a Gmail address.' },
  ]);
});

test('creating and renaming a list accepts a trimmed custom name and keeps its number', async (t) => {
  const existing = { listNumber: 2, name: 'List 3', isDeleted: false, save: async () => {} };
  t.mock.method(AdminEmailList, 'findOne', () => ({
    sort: () => ({ select: () => ({ lean: async () => ({ listNumber: 2 }) }) }),
  }));
  t.mock.method(AdminEmailList, 'create', async (value) => ({ _id: 'saved', ...value }));

  const created = await createList('person@gmail.com', '  Spring launch  ');
  assert.equal(created.list.name, 'Spring launch');
  assert.equal(created.list.listNumber, 3);

  t.mock.method(AdminEmailList, 'findById', async () => existing);
  const updated = await updateList('list-id', 'person@gmail.com', 'VIP customers');
  assert.equal(updated.list.name, 'VIP customers');
  assert.equal(existing.listNumber, 2);
});

test('blank creation names use the default, while renames must be nonblank and within 40 characters', async (t) => {
  const existing = { listNumber: 1, name: 'List 1', isDeleted: false, save: async () => {} };
  t.mock.method(AdminEmailList, 'findOne', () => ({
    sort: () => ({ select: () => ({ lean: async () => null }) }),
  }));
  t.mock.method(AdminEmailList, 'create', async (value) => value);
  const created = await createList('person@gmail.com', '  ');
  assert.equal(created.list.name, 'List 1');
  await assert.rejects(createList('person@gmail.com', 'x'.repeat(41)), /40 characters or fewer/);
  t.mock.method(AdminEmailList, 'findById', async () => existing);
  await assert.rejects(updateList('list-id', 'person@gmail.com', '  '), /Enter a name for this email list/);
  await assert.rejects(updateList('list-id', 'person@gmail.com', 'x'.repeat(41)), /40 characters or fewer/);
});

test('updating a list enforces the 100 accepted-address bound', async (t) => {
  const list = { save: async () => {} };
  t.mock.method(AdminEmailList, 'findById', async () => list);
  await assert.rejects(
    updateList('list-id', Array.from({ length: 101 }, (_, index) => `address${index}@gmail.com`)),
    /no more than 100 accepted Gmail addresses/,
  );
});

test('deleting a list hides it without recycling its audit-visible list number', async (t) => {
  const list = { listNumber: 4, isDeleted: false, save: async () => {} };
  t.mock.method(AdminEmailList, 'findById', async () => list);
  const result = await deleteList('list-id');
  assert.deepEqual(result, { deleted: true, listNumber: 4 });
  assert.equal(list.isDeleted, true);
});

test('signup cleanup removes the normalized address from every matching list and writes separate audit rows', async (t) => {
  t.mock.method(AdminEmailList, 'find', () => ({
    select: () => ({
      lean: async () => [
        { _id: 'list-1', listNumber: 1 },
        { _id: 'list-3', listNumber: 3 },
      ],
    }),
  }));
  const removedFrom = [];
  t.mock.method(AdminEmailList, 'updateOne', async (filter) => {
    removedFrom.push(filter._id);
    return { modifiedCount: 1 };
  });
  let auditRecords;
  t.mock.method(AdminEmailListAudit, 'insertMany', async (records) => {
    auditRecords = records;
    return records;
  });

  await removeSignedUpAddress('Person@googlemail.com');
  assert.deepEqual(removedFrom, ['list-1', 'list-3']);
  assert.deepEqual(auditRecords.map(({ listNumber, email, event }) => ({ listNumber, email, event })), [
    { listNumber: 1, email: 'person@gmail.com', event: 'SIGNED_UP' },
    { listNumber: 3, email: 'person@gmail.com', event: 'SIGNED_UP' },
  ]);
});

test('campaigns can send from a saved list and still skip registered and opted-out recipients', async (t) => {
  t.mock.method(AdminEmailList, 'findById', () => ({
    lean: async () => ({
      _id: 'saved-list',
      listNumber: 3,
      name: 'Saved list',
      emails: ['registered@gmail.com', 'optedout@gmail.com', 'new@gmail.com'],
    }),
  }));
  t.mock.method(AdminEmailCampaignHistory, 'create', async () => ({ _id: 'history-entry' }));
  t.mock.method(AdminEmailCampaignHistory, 'updateOne', async () => {});
  t.mock.method(User, 'find', () => ({
    select: () => ({ lean: async () => [{ email: 'registered@googlemail.com' }] }),
  }));
  t.mock.method(EmailUnsubscribe, 'find', () => ({
    select: () => ({ lean: async () => [{ email: 'optedout@googlemail.com' }] }),
  }));
  const sent = [];
  const result = await sendCampaign({
    templateId: 'customer_signup',
    recipientMode: 'BULK',
    recipientListId: 'saved-list',
    sender: async ({ recipient }) => sent.push(recipient),
  });
  assert.deepEqual(sent, ['new@gmail.com']);
  assert.deepEqual(result.skippedEmails, ['registered@gmail.com']);
  assert.deepEqual(result.optedOutEmails, ['optedout@gmail.com']);
  assert.equal(result.sent, 1);
});

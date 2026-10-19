import test from 'node:test';
import assert from 'node:assert/strict';

import PageVisit from '../src/models/PageVisit.js';
import User from '../src/models/User.js';
import Booking from '../src/models/Booking.js';
import CustomerWallet from '../src/models/CustomerWallet.js';
import { getAllUsers, getUserAdminSummary } from '../src/services/adminService.js';

const makeUser = (id, lastSeenAt, createdAt = null) => ({
  _id: id,
  lastSeenAt,
  createdAt,
  toSafeObject() {
    return { _id: id, lastSeenAt, createdAt };
  },
});

test('user list activity uses the latest visit/account activity and falls back to signup date', async (t) => {
  const joinedAt = new Date('2026-10-05T10:00:00.000Z');
  const olderVisit = new Date('2026-10-14T10:00:00.000Z');
  const newerLastSeen = new Date('2026-10-15T10:00:00.000Z');
  const pageVisitForUser = new Date('2026-10-16T10:00:00.000Z');
  const users = [
    makeUser('shivanis-id', olderVisit, joinedAt),
    makeUser('modi-hardik-id', null, joinedAt),
    makeUser('last-seen-id', newerLastSeen),
  ];

  t.mock.method(User, 'find', () => ({
    sort() { return this; },
    skip() { return this; },
    limit() { return Promise.resolve(users); },
  }));
  t.mock.method(User, 'countDocuments', () => Promise.resolve(users.length));
  t.mock.method(PageVisit, 'aggregate', () => Promise.resolve([
    { _id: 'shivanis-id', lastVisitedAt: pageVisitForUser },
  ]));

  const result = await getAllUsers(1, 10);

  const visitAggregation = PageVisit.aggregate.mock.calls[0].arguments[0];
  assert.deepEqual(visitAggregation[1].$group.lastVisitedAt, {
    $max: { $ifNull: ['$lastSeenAt', '$timestamp'] },
  });
  assert.equal(result.users[0].lastActiveAt.toISOString(), pageVisitForUser.toISOString());
  assert.equal(result.users[1].lastActiveAt.toISOString(), joinedAt.toISOString());
  assert.equal(result.users[2].lastActiveAt.toISOString(), newerLastSeen.toISOString());
});

test('activity-filtered user lists also return the profile-compatible lastActiveAt field', async (t) => {
  const pageVisitAt = new Date('2026-10-14T10:00:00.000Z');
  const user = makeUser('filtered-user-id', null);

  t.mock.method(User, 'aggregate', () => Promise.resolve([{
    users: [{ _id: user._id }],
    total: [{ count: 1 }],
  }]));
  t.mock.method(User, 'find', () => Promise.resolve([user]));
  t.mock.method(PageVisit, 'aggregate', () => Promise.resolve([
    { _id: user._id, lastVisitedAt: pageVisitAt },
  ]));

  const result = await getAllUsers(1, 10, false, '', '', 'ACTIVE');

  const statusPipeline = User.aggregate.mock.calls[0].arguments[0];
  const activityProjection = statusPipeline.find((stage) => stage.$set?.activityStatus);
  assert.ok(activityProjection);
  assert.deepEqual(
    statusPipeline.find((stage) => stage.$set?.lastActiveAt).$set.lastActiveAt,
    {
      $max: [
        { $ifNull: ['$latestPageVisitAt', '$createdAt'] },
        { $ifNull: ['$lastSeenAt', '$createdAt'] },
        '$createdAt',
      ],
    },
  );
  assert.equal(result.users[0].lastActiveAt.toISOString(), pageVisitAt.toISOString());
});

test('user profile activity falls back to signup date and advances to the latest tracked visit', async (t) => {
  const joinedAt = new Date('2026-10-05T10:00:00.000Z');
  const previousVisitAt = new Date('2026-10-10T10:00:00.000Z');
  const recentVisitAt = new Date();
  const user = {
    _id: 'profile-user-id',
    role: 'CUSTOMER',
    isActive: true,
    lastSeenAt: null,
    createdAt: joinedAt,
  };

  t.mock.method(User, 'findById', () => Promise.resolve(user));
  t.mock.method(Booking, 'aggregate', () => Promise.resolve([]));
  t.mock.method(PageVisit, 'find', () => ({
    select() { return this; },
    sort() { return this; },
    limit() { return this; },
    lean() {
      return Promise.resolve([
        { page: '/', timestamp: previousVisitAt, lastSeenAt: recentVisitAt, timeSpent: 0 },
      ]);
    },
  }));
  t.mock.method(CustomerWallet, 'findOne', () => ({
    select() { return this; },
    lean() { return Promise.resolve(null); },
  }));

  const summary = await getUserAdminSummary(user._id);

  assert.equal(summary.joinedAt.toISOString(), joinedAt.toISOString());
  assert.equal(summary.lastActiveAt.toISOString(), recentVisitAt.toISOString());
  assert.equal(summary.activityStatus, 'ACTIVE');
});

test('user profile activity summarizes time spent on each page in the latest session', async (t) => {
  const timestamp = new Date();
  const user = {
    _id: 'profile-page-time-id',
    role: 'CUSTOMER',
    isActive: true,
    lastSeenAt: timestamp,
    createdAt: timestamp,
  };

  t.mock.method(User, 'findById', () => Promise.resolve(user));
  t.mock.method(Booking, 'aggregate', () => Promise.resolve([]));
  t.mock.method(PageVisit, 'find', () => ({
    select() { return this; },
    sort() { return this; },
    limit() { return this; },
    lean() {
      return Promise.resolve([{
        page: '/profile',
        timestamp,
        lastSeenAt: timestamp,
        timeSpent: 63,
        pagesVisited: [
          { page: '/', timestamp: new Date(timestamp.getTime() - 63_000), timeSpent: 10 },
          { page: '/explore', timestamp: new Date(timestamp.getTime() - 53_000), timeSpent: 20 },
          { page: '/profile', timestamp: new Date(timestamp.getTime() - 33_000), timeSpent: 33 },
        ],
      }]);
    },
  }));
  t.mock.method(CustomerWallet, 'findOne', () => ({
    select() { return this; },
    lean() { return Promise.resolve(null); },
  }));

  const summary = await getUserAdminSummary(user._id);

  assert.equal(summary.lastSessionTimeSpent, 63);
  assert.deepEqual(
    summary.visitedPages.map(({ page, timeSpent }) => ({ page, timeSpent })),
    [
      { page: '/', timeSpent: 10 },
      { page: '/explore', timeSpent: 20 },
      { page: '/profile', timeSpent: 33 },
    ],
  );
});

test('user profile activity infers page time from page timestamps when stored durations are zero', async (t) => {
  const startedAt = new Date('2026-10-18T12:00:00.000Z');
  const user = {
    _id: 'profile-page-time-inference-id',
    role: 'CUSTOMER',
    isActive: true,
    lastSeenAt: new Date(startedAt.getTime() + 63_000),
    createdAt: startedAt,
  };

  t.mock.method(User, 'findById', () => Promise.resolve(user));
  t.mock.method(Booking, 'aggregate', () => Promise.resolve([]));
  t.mock.method(PageVisit, 'find', () => ({
    select() { return this; },
    sort() { return this; },
    limit() { return this; },
    lean() {
      return Promise.resolve([{
        page: '/profile',
        timestamp: startedAt,
        lastSeenAt: new Date(startedAt.getTime() + 63_000),
        timeSpent: 0,
        pagesVisited: [
          { page: '/', timestamp: startedAt, timeSpent: 0 },
          { page: '/explore', timestamp: new Date(startedAt.getTime() + 10_000), timeSpent: 0 },
          { page: '/profile', timestamp: new Date(startedAt.getTime() + 30_000), timeSpent: 0 },
        ],
      }]);
    },
  }));
  t.mock.method(CustomerWallet, 'findOne', () => ({
    select() { return this; },
    lean() { return Promise.resolve(null); },
  }));

  const summary = await getUserAdminSummary(user._id);

  assert.equal(summary.lastSessionTimeSpent, 63);
  assert.deepEqual(
    summary.visitedPages.map(({ page, timeSpent }) => ({ page, timeSpent })),
    [
      { page: '/', timeSpent: 10 },
      { page: '/explore', timeSpent: 20 },
      { page: '/profile', timeSpent: 33 },
    ],
  );
});

test('a recent signup date is used for profile status when the user has never visited', async (t) => {
  const joinedAt = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
  const user = {
    _id: 'new-customer-id',
    role: 'CUSTOMER',
    isActive: true,
    lastSeenAt: null,
    createdAt: joinedAt,
  };

  t.mock.method(User, 'findById', () => Promise.resolve(user));
  t.mock.method(Booking, 'aggregate', () => Promise.resolve([]));
  t.mock.method(PageVisit, 'find', () => ({
    select() { return this; },
    sort() { return this; },
    limit() { return this; },
    lean() { return Promise.resolve([]); },
  }));
  t.mock.method(CustomerWallet, 'findOne', () => ({
    select() { return this; },
    lean() { return Promise.resolve(null); },
  }));

  const summary = await getUserAdminSummary(user._id);

  assert.equal(summary.lastActiveAt.toISOString(), joinedAt.toISOString());
  assert.equal(summary.activityStatus, 'AWAY');
});

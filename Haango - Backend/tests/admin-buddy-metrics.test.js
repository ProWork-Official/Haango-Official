import test from 'node:test';
import assert from 'node:assert/strict';

import Booking from '../src/models/Booking.js';
import BuddyProfile from '../src/models/BuddyProfile.js';
import User from '../src/models/User.js';
import { getAllBuddies, getBuddyStats, getTodayBookingFilter } from '../src/services/adminService.js';

test('today booking range follows the India calendar date used when bookings are created', () => {
  const filter = getTodayBookingFilter(new Date('2025-01-01T19:00:00.000Z'));

  assert.deepEqual(filter, {
    isCleared: { $ne: true },
    date: {
      $gte: new Date('2025-01-02T00:00:00.000Z'),
      $lt: new Date('2025-01-03T00:00:00.000Z'),
    },
    bookingStatus: { $in: ['PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED'] },
  });
});

test('buddy summary counts Explore-visible profiles, incomplete signups, and distinct buddies booked today', async (t) => {
  const filters = { users: [], profiles: [], bookings: [] };
  t.mock.method(BuddyProfile, 'distinct', () => Promise.resolve(['buddy-with-profile']));
  t.mock.method(BuddyProfile, 'countDocuments', (filter) => {
    filters.profiles.push(filter);
    if (filter.verificationStatus === 'VERIFIED') return Promise.resolve(4);
    if (filter.verificationStatus === 'PENDING') return Promise.resolve(1);
    return Promise.resolve(2);
  });
  t.mock.method(User, 'countDocuments', (filter) => {
    filters.users.push(filter);
    return Promise.resolve(filter._id ? 3 : 10);
  });
  t.mock.method(Booking, 'distinct', (field, filter) => {
    filters.bookings.push({ field, filter });
    return Promise.resolve(field === 'buddyId' ? ['buddy-a', 'buddy-b'] : ['profile-a']);
  });

  const stats = await getBuddyStats();

  assert.deepEqual(stats, {
    totalBuddies: 10,
    verifiedBuddies: 4,
    pendingBuddies: 4,
    suspendedBuddies: 2,
    activeBuddies: 2,
  });
  assert.deepEqual(filters.profiles[0], {
    verificationStatus: 'VERIFIED',
    isAvailable: true,
    showOnFindCompanions: true,
  });
  assert.deepEqual(filters.users[1], {
    role: 'BUDDY',
    _id: { $nin: ['buddy-with-profile'] },
  });
  assert.equal(filters.bookings.every(({ filter }) => (
    filter.bookingStatus.$in.join(',') === 'PENDING,CONFIRMED,ONGOING,COMPLETED'
    && filter.isCleared.$ne === true
  )), true);
});

test('the active buddy filter returns only profiles with a qualifying booking today', async (t) => {
  const queryCalls = [];
  t.mock.method(Booking, 'distinct', (_field, filter) => {
    assert.ok(filter.date.$gte instanceof Date);
    return Promise.resolve(['booked-profile']);
  });
  t.mock.method(BuddyProfile, 'find', (filter) => {
    queryCalls.push(filter);
    const query = {
      populate() { return this; },
      sort() { return this; },
      limit() { return Promise.resolve([{ _id: 'booked-profile' }]); },
    };
    return query;
  });
  t.mock.method(BuddyProfile, 'countDocuments', () => Promise.resolve(1));

  const result = await getAllBuddies(1, 10, '', 'ACTIVE');

  assert.deepEqual(queryCalls, [{ _id: { $in: ['booked-profile'] } }]);
  assert.deepEqual(result, { buddies: [{ _id: 'booked-profile' }], total: 1 });
});

test('pending buddy list includes accounts that have not created a buddy profile', async (t) => {
  const profileFilterCalls = [];
  const missingAccount = {
    _id: 'new-buddy',
    name: 'New Buddy',
    email: 'new@example.test',
    createdAt: new Date('2025-01-02T00:00:00.000Z'),
  };
  t.mock.method(BuddyProfile, 'distinct', () => Promise.resolve(['profile-owner']));
  t.mock.method(BuddyProfile, 'find', (filter) => {
    profileFilterCalls.push(filter);
    return {
      populate() { return this; },
      sort() { return this; },
      limit() { return Promise.resolve([]); },
    };
  });
  t.mock.method(BuddyProfile, 'countDocuments', () => Promise.resolve(0));
  t.mock.method(User, 'find', () => ({
    select() { return this; },
    sort() { return this; },
    limit() { return Promise.resolve([missingAccount]); },
  }));
  t.mock.method(User, 'countDocuments', () => Promise.resolve(1));

  const result = await getAllBuddies(1, 10, '', 'PENDING');

  assert.deepEqual(profileFilterCalls, [{ verificationStatus: 'PENDING' }]);
  assert.equal(result.total, 1);
  assert.equal(result.buddies[0].profileMissing, true);
  assert.equal(result.buddies[0].verificationStatus, 'PENDING');
  assert.equal(result.buddies[0].userId, missingAccount);
});

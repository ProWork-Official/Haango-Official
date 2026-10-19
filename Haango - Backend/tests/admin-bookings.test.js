import test from 'node:test';
import assert from 'node:assert/strict';

import Booking from '../src/models/Booking.js';
import { getAllBookings } from '../src/services/bookingService.js';

function mockBookingQuery(t, rows = [], total = rows.length) {
  const calls = { filter: null, populated: [], sort: null, skip: null, limit: null };
  const query = {
    populate(path, fields) {
      calls.populated.push([path, fields]);
      return this;
    },
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
      return Promise.resolve(rows);
    },
  };

  t.mock.method(Booking, 'find', (filter) => {
    calls.filter = filter;
    return query;
  });
  t.mock.method(Booking, 'countDocuments', () => Promise.resolve(total));
  return calls;
}

test('admin bookings return populated booking parties and all non-cleared payment states', async (t) => {
  const rows = [{ bookingId: 'HG-1', payment: { status: 'FAILED' } }];
  const calls = mockBookingQuery(t, rows, 1);

  const result = await getAllBookings({ page: 2, limit: 10 });

  assert.deepEqual(result, { bookings: rows, total: 1 });
  assert.deepEqual(calls.filter, { isCleared: { $ne: true } });
  assert.deepEqual(calls.populated, [
    ['customerId', 'name email profileImage'],
    ['buddyId', 'name email profileImage'],
    ['buddyProfileId', 'displayName city'],
    ['activityId', 'name slug emoji'],
  ]);
  assert.deepEqual(calls.sort, { createdAt: -1 });
  assert.equal(calls.skip, 10);
  assert.equal(calls.limit, 10);
});

test('admin bookings apply the requested booking status filter', async (t) => {
  const calls = mockBookingQuery(t);

  await getAllBookings({ status: 'COMPLETED' });

  assert.deepEqual(calls.filter, {
    isCleared: { $ne: true },
    bookingStatus: 'COMPLETED',
  });
});

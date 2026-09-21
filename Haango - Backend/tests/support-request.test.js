import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSupportLockExpiry, isSupportLockActive } from '../src/services/supportRequestService.js';

test('support lock expiry is set to 48 hours from the last submission', () => {
  const createdAt = new Date('2026-09-10T12:00:00.000Z');
  const expiry = buildSupportLockExpiry(createdAt);

  assert.equal(expiry.toISOString(), '2026-09-12T12:00:00.000Z');
});

test('support lock remains active while a submission is still within the 48-hour window', () => {
  const now = new Date('2026-09-11T18:00:00.000Z');
  const lockedUntil = new Date('2026-09-12T12:00:00.000Z');

  assert.equal(isSupportLockActive(now, lockedUntil), true);
});

test('support lock is cleared once the 48-hour window has expired', () => {
  const now = new Date('2026-09-12T12:00:01.000Z');
  const lockedUntil = new Date('2026-09-12T12:00:00.000Z');

  assert.equal(isSupportLockActive(now, lockedUntil), false);
});

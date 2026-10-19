import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { formatLastActive, inferPageDurations } from '../src/lib/adminActivity.js';

test('profile and list activity formatter represents relative dates consistently', () => {
  const now = Date.parse('2026-10-18T12:00:00.000Z');

  assert.equal(formatLastActive('2026-10-14T12:00:00.000Z', now), '4d ago');
  assert.equal(formatLastActive(null, now), 'No activity recorded');
  assert.equal(formatLastActive('2026-10-18T11:59:30.000Z', now, true), 'Active Now');
});

test('page activity infers zero durations from the next page and session end timestamps', () => {
  const startedAt = Date.parse('2026-10-18T12:00:00.000Z');
  const pages = inferPageDurations([
    { page: '/', timestamp: new Date(startedAt).toISOString(), timeSpent: 0 },
    { page: '/explore', timestamp: new Date(startedAt + 10_000).toISOString(), timeSpent: 0 },
    { page: '/profile', timestamp: new Date(startedAt + 30_000).toISOString(), timeSpent: 0 },
  ], new Date(startedAt + 63_000).toISOString());

  assert.deepEqual(pages.map(({ page, timeSpent }) => ({ page, timeSpent })), [
    { page: '/', timeSpent: 10 },
    { page: '/explore', timeSpent: 20 },
    { page: '/profile', timeSpent: 33 },
  ]);
});

test('page activity preserves recorded duration and avoids negative inferred time', () => {
  const pages = inferPageDurations([
    { page: '/recorded', timestamp: '2026-10-18T12:00:00.000Z', timeSpent: 4 },
    { page: '/future', timestamp: '2026-10-18T12:00:10.000Z', timeSpent: 0 },
  ], '2026-10-18T12:00:05.000Z');

  assert.deepEqual(pages.map(({ timeSpent }) => timeSpent), [4, 0]);
});

test('admin user table reads the shared lastActiveAt activity value and formatter', async () => {
  const page = await readFile(new URL('../src/Pages/AdminAllUsersPage.jsx', import.meta.url), 'utf8');

  assert.match(page, /user\.lastActiveAt \?\? user\.lastSeenAt/);
  assert.match(page, /formatLastActive\(lastActiveAt, currentTime, isCurrentlyActive\)/);
  assert.doesNotMatch(page, /if \(!user\.lastSeenAt\) return '—'/);
});

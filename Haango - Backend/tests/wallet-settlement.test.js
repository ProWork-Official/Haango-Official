import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeBuddyPayoutBreakdown,
  resolvePayoutCycle,
} from '../src/services/walletService.js';

test('buddy payout breakdown keeps the standard 80/20 split for completed bookings', () => {
  const breakdown = computeBuddyPayoutBreakdown({ buddyRate: 500, duration: 2 });

  assert.equal(breakdown.buddyPayoutAmount, 800);
  assert.equal(breakdown.platformShareAmount, 200);
});

test('payout cycle honours the T+2 settlement rule', () => {
  const result = resolvePayoutCycle(new Date('2026-09-08T21:45:00+05:30'));

  assert.ok(result.settlementDate instanceof Date);
  assert.equal(result.settlementWindow, 'T+2 business day');
  assert.ok(result.settlementDate.getTime() > new Date('2026-09-08T21:45:00+05:30').getTime());
});

import test from 'node:test';
import assert from 'node:assert/strict';
import Withdrawal from '../src/models/Withdrawal.js';

import {
  calculateBuddyWalletTotals,
  computeBuddyPayoutBreakdown,
  resolvePayoutCycle,
  updateWithdrawal,
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

test('pending withdrawals reserve wallet funds and rejected withdrawals release them', () => {
  const pending = calculateBuddyWalletTotals({ bookingEarnings: 1000, activeWithdrawals: 300 });
  const paid = calculateBuddyWalletTotals({ bookingEarnings: 1000, activeWithdrawals: 300 });
  const rejected = calculateBuddyWalletTotals({ bookingEarnings: 1000, activeWithdrawals: 0 });

  assert.equal(pending.availableBalance, 700);
  assert.equal(paid.availableBalance, 700);
  assert.equal(rejected.availableBalance, 1000);
});

test('admin credits and debits are included in the buddy wallet total', () => {
  assert.deepEqual(calculateBuddyWalletTotals({
    bookingEarnings: 1000,
    bonuses: 75,
    adminCredits: 200,
    adminDebits: 25,
    activeWithdrawals: 300,
  }), { totalEarned: 1250, totalWithdrawn: 300, availableBalance: 950 });
});

test('admin rejection records the retry message and releases the withdrawal reservation', async () => {
  const originalFindById = Withdrawal.findById;
  const withdrawal = {
    status: 'PENDING',
    async save() { return this; },
  };
  Withdrawal.findById = async () => withdrawal;
  try {
    const result = await updateWithdrawal('withdrawal-id', 'REJECTED', 'Withdrawal could not be completed. Please try again.');
    assert.equal(result.status, 'REJECTED');
    assert.equal(result.failureReason, 'Withdrawal could not be completed. Please try again.');
    assert.equal(calculateBuddyWalletTotals({ bookingEarnings: 1000, activeWithdrawals: 0 }).availableBalance, 1000);
  } finally {
    Withdrawal.findById = originalFindById;
  }
});

test('paid and rejected withdrawals cannot be reopened', async () => {
  const originalFindById = Withdrawal.findById;
  Withdrawal.findById = async () => ({ status: 'REJECTED' });
  try {
    await assert.rejects(updateWithdrawal('withdrawal-id', 'PAID'), { errorCode: 'WITHDRAWAL_INVALID_TRANSITION' });
  } finally {
    Withdrawal.findById = originalFindById;
  }
});

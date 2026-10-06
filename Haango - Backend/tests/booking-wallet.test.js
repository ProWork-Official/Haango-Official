import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateCheckoutAmounts } from '../src/services/pricingService.js';

test('wallet is applied after coupon and PayU receives only the remainder', () => {
  assert.deepEqual(calculateCheckoutAmounts(309, 100, 150, true), {
    amountAfterCoupon: 209,
    walletAmount: 150,
    paymentAmount: 59,
  });
});

test('wallet use is capped at the discounted total and uses whole rupees', () => {
  assert.deepEqual(calculateCheckoutAmounts(309, 100, 500.75, true), {
    amountAfterCoupon: 209,
    walletAmount: 209,
    paymentAmount: 0,
  });
});

test('checkout leaves wallet balance untouched when wallet use is disabled', () => {
  assert.deepEqual(calculateCheckoutAmounts(309, 100, 150, false), {
    amountAfterCoupon: 209,
    walletAmount: 0,
    paymentAmount: 209,
  });
});
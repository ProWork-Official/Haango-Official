import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateBookingPrice,
  calculateCheckoutAmounts,
} from '../src/services/pricingService.js';
import { getBookingPriceQuote } from '../src/services/bookingService.js';

test('price quote rejects malformed buddy IDs before querying MongoDB', async () => {
  await assert.rejects(
    getBookingPriceQuote('quote', 1),
    { errorCode: 'INVALID_BUDDY_ID' },
  );
});

test('booking price breakdown adds buddy and platform fees to the total', () => {
  const quote = calculateBookingPrice(300, 1);

  assert.equal(quote.buddyFee, 300);
  assert.equal(quote.totalAmount, quote.buddyFee + quote.platformFee);
});

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
import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateWalletAdjustment } from '../src/services/customerWalletService.js';

test('admin wallet adjustment adds a delta to the existing balance', () => {
  assert.equal(calculateWalletAdjustment(200, 100), 300);
});

test('admin wallet adjustment subtracts a negative delta', () => {
  assert.equal(calculateWalletAdjustment(200, -50), 150);
});

test('admin wallet adjustment cannot leave a negative balance', () => {
  assert.throws(() => calculateWalletAdjustment(200, -201), {
    errorCode: 'INSUFFICIENT_WALLET_BALANCE',
  });
});

test('admin wallet adjustment only accepts whole-rupee amounts', () => {
  assert.throws(() => calculateWalletAdjustment(200, 1.5), {
    errorCode: 'INVALID_WALLET_ADJUSTMENT',
  });
});
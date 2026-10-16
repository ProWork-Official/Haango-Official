import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveVisitorDisplayName } from '../src/services/analyticsService.js';

test('resolveVisitorDisplayName returns the actual signed-in user name', () => {
  assert.equal(resolveVisitorDisplayName('Priya Sharma', null), 'Priya Sharma');
  assert.equal(resolveVisitorDisplayName(null, { name: 'Aarav Singh' }), 'Aarav Singh');
  assert.equal(resolveVisitorDisplayName('', { name: 'Neha Verma' }), 'Neha Verma');
  assert.equal(resolveVisitorDisplayName(null, null), null);
});

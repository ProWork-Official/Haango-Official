import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldTrackPageVisit } from '../src/lib/pageVisitTracking.js';

test('page visits are not tracked on localhost', () => {
  assert.equal(shouldTrackPageVisit('localhost', '/'), false);
  assert.equal(shouldTrackPageVisit('app.localhost', '/explore'), false);
});

test('page visits are not tracked on admin routes', () => {
  assert.equal(shouldTrackPageVisit('haango.in', '/admin'), false);
  assert.equal(shouldTrackPageVisit('haango.in', '/admin/users'), false);
});

test('non-admin routes on production hosts continue to be tracked', () => {
  assert.equal(shouldTrackPageVisit('haango.in', '/'), true);
  assert.equal(shouldTrackPageVisit('haango.in', '/explore'), true);
  assert.equal(shouldTrackPageVisit('haango.in', '/administrator'), true);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyAcquisitionSource, normalizeReferrerOrigin } from '../src/utils/acquisitionSource.js';

test('classifies direct visits without identifying metadata', () => {
  assert.deepEqual(classifyAcquisitionSource('', '/'), {
    acquisitionSource: 'DIRECT',
    acquisitionDetail: '',
  });
});

test('classifies Google search and keeps only its normalized source detail', () => {
  assert.deepEqual(classifyAcquisitionSource('https://www.google.co.in/search?q=haango', '/'), {
    acquisitionSource: 'GOOGLE_SEARCH',
    acquisitionDetail: 'www.google.co.in',
  });
});

test('classifies social and WhatsApp referrers', () => {
  assert.equal(classifyAcquisitionSource('https://l.instagram.com/path', '/').acquisitionSource, 'SOCIAL');
  assert.equal(classifyAcquisitionSource('https://api.whatsapp.com/send', '/').acquisitionSource, 'WHATSAPP');
});

test('classifies Haango share links from campaign parameters', () => {
  assert.deepEqual(classifyAcquisitionSource('', '/profile?utm_source=haango_share&utm_medium=share'), {
    acquisitionSource: 'CUSTOM_SHARE',
    acquisitionDetail: 'haango_share',
  });
});

test('preserves generic external referrals and labels unknown campaign sources as other', () => {
  assert.equal(classifyAcquisitionSource('https://example.org/article?email=private', '/').acquisitionDetail, 'example.org');
  assert.deepEqual(classifyAcquisitionSource('', '/?utm_source=partner'), {
    acquisitionSource: 'OTHER',
    acquisitionDetail: 'partner',
  });
});

test('stores only the referrer origin, excluding paths and query parameters', () => {
  assert.equal(normalizeReferrerOrigin('https://example.org/path?email=private'), 'https://example.org');
  assert.equal(normalizeReferrerOrigin('javascript:alert(1)'), '');
});
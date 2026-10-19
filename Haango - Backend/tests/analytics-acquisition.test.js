import test from 'node:test';
import assert from 'node:assert/strict';

import PageVisit from '../src/models/PageVisit.js';
import User from '../src/models/User.js';
import { countRecordedPageVisits, trackPageVisit } from '../src/services/analyticsService.js';
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
  assert.equal(classifyAcquisitionSource('https://l.instagram.com/path', '/').acquisitionSource, 'INSTAGRAM');
  assert.equal(classifyAcquisitionSource('https://api.whatsapp.com/send', '/').acquisitionSource, 'WHATSAPP');
  assert.equal(classifyAcquisitionSource('', '/?utm_source=whatsapp&utm_medium=message').acquisitionSource, 'WHATSAPP');
});

test('classifies Gmail from its referrer or campaign source', () => {
  assert.deepEqual(classifyAcquisitionSource('https://mail.google.com/mail/u/0/', '/'), {
    acquisitionSource: 'GMAIL',
    acquisitionDetail: 'mail.google.com',
  });
  assert.deepEqual(classifyAcquisitionSource('', '/?utm_source=gmail&utm_medium=email'), {
    acquisitionSource: 'GMAIL',
    acquisitionDetail: 'gmail',
  });
});

test('accepts Gmail and WhatsApp as persisted acquisition sources', () => {
  const validSources = PageVisit.schema.path('acquisitionSource').enumValues;
  assert.ok(validSources.includes('GMAIL'));
  assert.ok(validSources.includes('WHATSAPP'));
});

test('updates an existing session visit when a tagged WhatsApp link is opened', async () => {
  const originalFindOneAndUpdate = PageVisit.findOneAndUpdate;
  let update;
  PageVisit.findOneAndUpdate = async (_filter, updateDocument) => {
    update = updateDocument;
  };

  try {
    await trackPageVisit(
      null,
      'visitor-123',
      '/signup',
      0,
      '',
      'test-agent',
      '127.0.0.1',
      'visit-123',
      '/signup?utm_source=whatsapp',
      'https://haango.in',
    );
  } finally {
    PageVisit.findOneAndUpdate = originalFindOneAndUpdate;
  }

  assert.equal(update.$set.acquisitionSource, 'WHATSAPP');
  assert.equal(update.$set.acquisitionDetail, 'whatsapp');
});

test('a later direct page tracking update does not erase an attributed source', async () => {
  const originalFindOneAndUpdate = PageVisit.findOneAndUpdate;
  let update;
  PageVisit.findOneAndUpdate = async (_filter, updateDocument) => {
    update = updateDocument;
  };

  try {
    await trackPageVisit(
      null,
      'visitor-123',
      '/explore',
      0,
      '',
      'test-agent',
      '127.0.0.1',
      'visit-123',
      '/explore',
      'https://haango.in',
    );
  } finally {
    PageVisit.findOneAndUpdate = originalFindOneAndUpdate;
  }

  assert.equal(update.$set.acquisitionSource, undefined);
  assert.equal(update.$set.acquisitionDetail, undefined);
});

test('a subsequent website visit refreshes the persisted activity timestamp for its session', async (t) => {
  const originalFindOneAndUpdate = PageVisit.findOneAndUpdate;
  let update;
  t.mock.method(User, 'findById', () => ({
    select() { return this; },
    lean() { return Promise.resolve({ name: 'Website visitor' }); },
  }));
  t.mock.method(PageVisit, 'updateMany', () => Promise.resolve());
  PageVisit.findOneAndUpdate = async (_filter, updateDocument) => {
    update = updateDocument;
  };

  const userId = '507f1f77bcf86cd799439011';
  try {
    await trackPageVisit(
      userId,
      'visitor-123',
      '/account',
      0,
      '',
      'test-agent',
      '127.0.0.1',
      'visit-123',
      '/account',
      'https://haango.in',
    );
  } finally {
    PageVisit.findOneAndUpdate = originalFindOneAndUpdate;
  }

  assert.ok(update.$set.lastSeenAt instanceof Date);
  assert.ok(Date.now() - update.$set.lastSeenAt.getTime() < 5000);
  assert.equal(update.$set.userId, userId);
});

test('counts all recorded page entries across sessions, including records without a page history', () => {
  assert.equal(countRecordedPageVisits([
    { pagesVisited: [{ page: '/' }, { page: '/explore' }, { page: '/profile' }] },
    { pagesVisited: [{ page: '/signup' }] },
    { pagesVisited: [] },
  ]), 5);
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
import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveVisitorDisplayName } from '../src/services/analyticsService.js';
import { getPlatformActivity } from '../src/services/analyticsService.js';
import PageVisit from '../src/models/PageVisit.js';
import { createCampaignAttributionToken } from '../src/utils/campaignAttributionToken.js';

test('resolveVisitorDisplayName returns the actual signed-in user name', () => {
  assert.equal(resolveVisitorDisplayName('Priya Sharma', null), 'Priya Sharma');
  assert.equal(resolveVisitorDisplayName(null, { name: 'Aarav Singh' }), 'Aarav Singh');
  assert.equal(resolveVisitorDisplayName('', { name: 'Neha Verma' }), 'Neha Verma');
  assert.equal(resolveVisitorDisplayName(null, null), null);
});

test('platform activity resolves campaign email only for anonymous guest visits', async (t) => {
  const campaignToken = createCampaignAttributionToken('guest@example.com');
  const signedInId = '507f1f77bcf86cd799439011';
  t.mock.method(PageVisit, 'aggregate', (pipeline) => {
    if (pipeline.some((stage) => stage.$group?._id === '$resolvedAcquisitionSource')) {
      return Promise.resolve([]);
    }
    if (pipeline.some((stage) => stage.$group?._id === '$page')) return Promise.resolve([]);
    return Promise.resolve([{ totalVisits: 2, uniqueVisitors: 2, signedInVisitors: 1, totalTimeSpent: 0 }]);
  });
  t.mock.method(PageVisit, 'find', () => ({
    select() { return this; },
    sort() { return this; },
    lean: async () => [
      { _id: 'guest-visit', visitorId: 'guest', visitId: 'guest-session', page: '/', timestamp: new Date(), pagesVisited: [], campaignAttributionToken: campaignToken },
      { _id: 'signed-in-visit', visitorId: 'member', visitId: 'member-session', page: '/', timestamp: new Date(), pagesVisited: [], userId: signedInId, userName: 'Member', campaignAttributionToken: campaignToken },
    ],
  }));

  const activity = await getPlatformActivity(7);
  const guestVisit = activity.recentVisits.find((visit) => visit.visitorType === 'GUEST');
  const signedInVisit = activity.recentVisits.find((visit) => visit.visitorType === 'SIGNED_IN');

  assert.equal(guestVisit.campaignAttributionEmail, 'guest@example.com');
  assert.equal(signedInVisit.displayName, 'Member');
  assert.equal(Object.hasOwn(signedInVisit, 'campaignAttributionEmail'), false);
});

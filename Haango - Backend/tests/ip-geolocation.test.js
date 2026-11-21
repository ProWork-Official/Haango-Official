import test from 'node:test';
import assert from 'node:assert/strict';

import { isPublicIp, lookupIpLocation, normalizeLocation } from '../src/services/ipGeolocationService.js';
import '../src/services/analyticsService.js';

test('rejects local, private, and reserved IP addresses', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.1.1', '::1', 'fc00::1', 'fe80::1']) {
    assert.equal(isPublicIp(address), false, `${address} should not be geolocated`);
  }
  assert.equal(isPublicIp('8.8.8.8'), true);
});

test('normalizes provider results to city, region, and country only', () => {
  assert.deepEqual(normalizeLocation({
    success: true,
    city: 'Mumbai',
    region: 'Maharashtra',
    country: 'India',
    ip: '8.8.8.8',
    latitude: 19.076,
    longitude: 72.8777,
  }), { city: 'Mumbai', region: 'Maharashtra', country: 'India' });
  assert.equal(normalizeLocation({ success: false }), null);
});

test('does not call the provider for a private IP', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('private IP must not be sent'); };
  try {
    assert.equal(await lookupIpLocation('192.168.1.10'), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('looks up public IPs and keeps only the returned location fields', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url);
    return {
      ok: true,
      json: async () => ({ success: true, city: 'Mumbai', region: 'Maharashtra', country: 'India', latitude: 19.076 }),
    };
  };
  try {
    assert.deepEqual(await lookupIpLocation('8.8.8.8'), {
      city: 'Mumbai',
      region: 'Maharashtra',
      country: 'India',
    });
    assert.equal(requestedUrl.hostname, 'ipwho.is');
    assert.equal(requestedUrl.searchParams.get('fields'), 'success,country,region,city');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkIndiaAvailability } from '../src/lib/siteAccess.js';

test('checks the visitor IP country through the geolocation provider', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url);
    return {
      ok: true,
      json: async () => ({ success: true, country_code: 'IN' }),
    };
  };

  try {
    assert.equal(await checkIndiaAvailability(), true);
    assert.equal(requestedUrl.hostname, 'ipwho.is');
    assert.equal(requestedUrl.searchParams.get('fields'), 'success,country_code');
    assert.equal(requestedUrl.pathname, '/');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects visitors whose country code is not India', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ success: true, country_code: 'US' }),
  });

  try {
    assert.equal(await checkIndiaAvailability(), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fails closed when the provider cannot verify a country', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ success: false }),
  });

  try {
    await assert.rejects(checkIndiaAvailability(), /invalid response/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCampaignAttributionToken,
  getEmailFromCampaignAttributionToken,
} from '../src/utils/campaignAttributionToken.js';

test('campaign attribution token encrypts the email and resolves only on the server', () => {
  const email = 'visitor@example.com';
  const token = createCampaignAttributionToken(email, 1_000);

  assert.ok(token.length < 512);
  assert.doesNotMatch(token, /visitor@example\.com|visitor%40example\.com/);
  assert.equal(getEmailFromCampaignAttributionToken(token, 2_000), email);
});

test('campaign attribution token rejects tampering, malformed data, and expired links', () => {
  const token = createCampaignAttributionToken('visitor@example.com', 1_000);
  const [version, iv, ciphertext, tag, signature] = token.split('.');
  const changedToken = `${version}.${iv}.${ciphertext.slice(0, -1)}${ciphertext.endsWith('a') ? 'b' : 'a'}.${tag}.${signature}`;

  assert.equal(getEmailFromCampaignAttributionToken(changedToken, 2_000), null);
  assert.equal(getEmailFromCampaignAttributionToken(token, 181 * 24 * 60 * 60 * 1000), null);
  assert.equal(getEmailFromCampaignAttributionToken('not-a-token'), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBulkEmailRecipients } from '../src/lib/emailRecipients.js';

test('bulk recipient validation normalizes and deduplicates valid addresses', () => {
  assert.deepEqual(
    parseBulkEmailRecipients(' First@Example.com \n\nsecond@example.org\nfirst@example.com'),
    { emails: ['first@example.com', 'second@example.org'], error: '' },
  );
});

test('bulk recipient validation reports invalid input and more than 100 unique addresses', () => {
  assert.match(parseBulkEmailRecipients('valid@example.com\nbad-address').error, /line 2/);
  assert.match(
    parseBulkEmailRecipients(Array.from({ length: 101 }, (_, index) => `person${index}@example.com`).join('\n')).error,
    /no more than 100 unique email addresses/,
  );
});

test('bulk recipient validation requires at least one nonblank address', () => {
  assert.match(parseBulkEmailRecipients(' \n\n').error, /at least one valid email address/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBulkEmailRecipients } from '../src/lib/emailRecipients.js';

test('bulk recipient validation normalizes Gmail aliases, skips invalid domains, and deduplicates', () => {
  assert.deepEqual(
    parseBulkEmailRecipients(' First@Googlemail.com \tsecond@gmail.com\nfirst@gmail.com\nbad-address\nother@example.org'),
    {
      rawCount: 5,
      emails: ['first@gmail.com', 'second@gmail.com'],
      skipped: [
        { value: 'bad-address', reason: 'Invalid email address.' },
        { value: 'other@example.org', reason: 'Not a Gmail address.' },
      ],
      error: '',
    },
  );
});

test('bulk recipient validation skips malformed input and caps valid unique addresses at 100', () => {
  const mixed = parseBulkEmailRecipients('valid@gmail.com\nbad-address');
  assert.equal(mixed.rawCount, 2);
  assert.deepEqual(mixed.emails, ['valid@gmail.com']);
  assert.deepEqual(mixed.skipped, [{ value: 'bad-address', reason: 'Invalid email address.' }]);
  assert.equal(mixed.error, '');
  assert.match(
    parseBulkEmailRecipients(Array.from({ length: 101 }, (_, index) => `person${index}@gmail.com`).join('\n')).error,
    /no more than 100 unique Gmail addresses/,
  );
});

test('bulk recipient validation requires at least one valid Gmail address', () => {
  assert.match(parseBulkEmailRecipients(' \n\n').error, /at least one valid Gmail address/);
});

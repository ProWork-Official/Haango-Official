import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createPayuRequestHash, verifyPayuResponseHash } from '../src/services/payuService.js';

const salt = 'unit-test-salt';

test('PayU request hash signs the transaction and customer fields', () => {
  const fields = {
    key: 'merchant-key',
    txnid: 'HA0123456789abcdef0123',
    amount: '618.00',
    productinfo: 'Haango booking HNG-123',
    firstname: 'Asha',
    email: 'asha@example.com',
    udf1: 'booking-object-id',
    udf2: 'HNG-123',
  };
  const canonical = [
    'merchant-key', 'HA0123456789abcdef0123', '618.00', 'Haango booking HNG-123',
    'Asha', 'asha@example.com', 'booking-object-id', 'HNG-123', '', '', '',
    '', '', '', '', '', 'unit-test-salt',
  ].join('|');

  assert.equal(createPayuRequestHash(fields, salt), crypto.createHash('sha512').update(canonical).digest('hex'));
});

test('PayU response hash validation rejects tampered payment fields', () => {
  const fields = {
    key: 'merchant-key',
    txnid: 'HA0123456789abcdef0123',
    amount: '618.00',
    productinfo: 'Haango booking HNG-123',
    firstname: 'Asha',
    email: 'asha@example.com',
    status: 'success',
    udf1: 'booking-object-id',
    udf2: 'HNG-123',
    udf3: 'buddy-profile-id',
  };
  const canonical = [
    salt,
    'success',
    ...Array(5).fill(''),
    '',
    '',
    fields.udf3,
    fields.udf2,
    fields.udf1,
    fields.email,
    fields.firstname,
    fields.productinfo,
    fields.amount,
    fields.txnid,
    fields.key,
  ].join('|');
  fields.hash = crypto.createHash('sha512').update(canonical).digest('hex');

  assert.equal(verifyPayuResponseHash(fields, salt), true);
  assert.equal(verifyPayuResponseHash({ ...fields, amount: '1.00' }, salt), false);
});
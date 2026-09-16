import test from 'node:test';
import assert from 'node:assert/strict';

import { generateOtpCode, getBootstrapAdminUsers, isLoginOtpRequired, normalizeRole } from '../src/services/authService.js';

test('generateOtpCode creates a 6-digit string', () => {
  const code = generateOtpCode();

  assert.equal(code.length, 6);
  assert.match(code, /^\d{6}$/);
});

test('normalizeRole maps frontend values to backend roles', () => {
  assert.equal(normalizeRole('customer'), 'CUSTOMER');
  assert.equal(normalizeRole('buddy'), 'BUDDY');
  assert.equal(normalizeRole('admin'), 'ADMIN');
  assert.equal(normalizeRole('CUSTOMER'), 'CUSTOMER');
});

test('bootstrap admin seed creates a secure database-backed default admin set', () => {
  const admins = getBootstrapAdminUsers();

  assert.equal(admins.length, 2);
  assert.deepEqual(
    admins.map((admin) => admin.email),
    [
      'ayushjaiswal2425@gmail.com',
      'harshikayadav2425@gmail.com',
    ]
  );
  assert.ok(admins.every((admin) => admin.role === 'ADMIN'));
  assert.ok(admins.every((admin) => admin.password.length >= 8));
});

test('login otp is required after logout or a 30-day inactivity gap', () => {
  const now = new Date('2026-09-09T00:00:00.000Z');

  assert.equal(
    isLoginOtpRequired({ requiresOtpReauth: true, lastSeenAt: null }, now),
    true
  );

  assert.equal(
    isLoginOtpRequired({ requiresOtpReauth: false, lastSeenAt: new Date('2026-08-01T00:00:00.000Z') }, now),
    true
  );

  assert.equal(
    isLoginOtpRequired({ requiresOtpReauth: false, lastSeenAt: new Date('2026-09-01T00:00:00.000Z') }, now),
    false
  );
});

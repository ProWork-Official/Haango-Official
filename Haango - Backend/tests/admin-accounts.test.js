import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  getAdministratorsFilter,
  setAdminCreatorOnPromotion,
} from '../src/services/adminService.js';
import User from '../src/models/User.js';

test('User stores nullable creator attribution as a self-reference', () => {
  const creatorPath = User.schema.path('adminCreatedBy');

  assert.equal(creatorPath.options.ref, 'User');
  assert.equal(creatorPath.defaultValue, null);
});

test('MASTER_ADMIN viewers can see all three administrator roles', () => {
  assert.deepEqual(getAdministratorsFilter('MASTER_ADMIN'), {
    role: { $in: ['MASTER_ADMIN', 'SUPER_ADMIN', 'ADMIN'] },
  });
});

test('SUPER_ADMIN viewers can see SUPER_ADMIN and ADMIN accounts', () => {
  assert.deepEqual(getAdministratorsFilter('SUPER_ADMIN'), {
    role: { $in: ['SUPER_ADMIN', 'ADMIN'] },
  });
});

test('ADMIN viewers can see ADMIN accounts only', () => {
  assert.deepEqual(getAdministratorsFilter('ADMIN'), {
    role: { $in: ['ADMIN'] },
  });
});

test('unknown viewer roles receive no administrator accounts', () => {
  assert.deepEqual(getAdministratorsFilter('CUSTOMER'), {
    role: { $in: [] },
  });
});

test('administrator endpoint derives its visibility filter from the authenticated caller', () => {
  const controllerSource = readFileSync(
    new URL('../src/controllers/adminController.js', import.meta.url),
    'utf8',
  );
  assert.match(controllerSource, /getAdministratorsFilter\(req\.user\?\.role\)/);
  assert.match(controllerSource, /return getAdministrators\(req, res, next\)/);
});

test('promotion records the creator when a user first becomes an admin', () => {
  const newAdmin = { role: 'CUSTOMER' };
  const creator = { _id: 'creator-id' };

  setAdminCreatorOnPromotion(newAdmin, creator);

  assert.equal(newAdmin.adminCreatedBy, creator._id);
});

test('promotion to a higher admin role preserves the original creator', () => {
  const existingAdmin = { role: 'ADMIN', adminCreatedBy: 'original-creator-id' };

  setAdminCreatorOnPromotion(existingAdmin, { _id: 'upgrader-id' });

  assert.equal(existingAdmin.adminCreatedBy, 'original-creator-id');
});

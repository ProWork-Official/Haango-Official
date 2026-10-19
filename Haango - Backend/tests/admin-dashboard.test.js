import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAllUsersBaseFilter,
  getDashboardUserCountFilter,
} from '../src/services/adminService.js';
import { RETIRED_MASTER_ADMIN_EMAIL } from '../src/config/adminAccounts.js';

test('dashboard total-user query excludes master admins and the retired account without excluding lower admin levels', () => {
  assert.deepEqual(getDashboardUserCountFilter(), {
    role: { $ne: 'MASTER_ADMIN' },
    email: { $ne: RETIRED_MASTER_ADMIN_EMAIL },
  });
});

test('admin-inclusive user results include ADMIN and SUPER_ADMIN but never MASTER_ADMIN', () => {
  assert.deepEqual(getAllUsersBaseFilter(true), {
    role: { $in: ['CUSTOMER', 'BUDDY', 'ADMIN', 'SUPER_ADMIN'] },
  });
});

test('default user-management results retain the CUSTOMER/BUDDY-only scope', () => {
  assert.deepEqual(getAllUsersBaseFilter(), {
    role: { $in: ['CUSTOMER', 'BUDDY'] },
  });
});

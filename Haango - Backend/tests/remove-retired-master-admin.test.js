import test from 'node:test';
import assert from 'node:assert/strict';

import { RETIRED_MASTER_ADMIN_EMAIL } from '../src/config/adminAccounts.js';
import { removeRetiredMasterAdmin } from '../src/utils/removeRetiredMasterAdmin.js';

const validUser = { _id: 'target-user-id', role: 'MASTER_ADMIN', adminLevel: 3 };

function makeModels(user = validUser) {
  const calls = [];
  return {
    calls,
    User: {
      async findOne(filter) {
        calls.push(['findOne', filter]);
        return user;
      },
      async deleteOne(filter) {
        calls.push(['deleteUser', filter]);
        return { deletedCount: 1 };
      },
    },
    RefreshToken: {
      async deleteMany(filter) {
        calls.push(['deleteRefreshTokens', filter]);
        return { deletedCount: 2 };
      },
    },
    OtpRequest: {
      async deleteMany(filter) {
        calls.push(['deleteOtpRequests', filter]);
        return { deletedCount: 3 };
      },
    },
    PushSubscription: {
      async deleteMany(filter) {
        calls.push(['deletePushSubscriptions', filter]);
        return { deletedCount: 1 };
      },
    },
  };
}

test('retired master-admin cleanup deletes only its auth/session records and exact user', async () => {
  const models = makeModels();

  const result = await removeRetiredMasterAdmin(models);

  assert.deepEqual(result, {
    removed: true,
    refreshTokens: 2,
    otpRequests: 3,
    pushSubscriptions: 1,
  });
  assert.deepEqual(models.calls, [
    ['findOne', { email: RETIRED_MASTER_ADMIN_EMAIL }],
    ['deleteRefreshTokens', { userId: validUser._id }],
    ['deleteOtpRequests', { email: RETIRED_MASTER_ADMIN_EMAIL }],
    ['deletePushSubscriptions', { userId: validUser._id }],
    ['deleteUser', {
      _id: validUser._id,
      email: RETIRED_MASTER_ADMIN_EMAIL,
      role: 'MASTER_ADMIN',
      adminLevel: 3,
    }],
  ]);
});

test('retired master-admin cleanup is a no-op when the exact account is absent', async () => {
  const models = makeModels(null);

  assert.deepEqual(await removeRetiredMasterAdmin(models), {
    removed: false,
    reason: 'NOT_FOUND',
  });
  assert.deepEqual(models.calls, [['findOne', { email: RETIRED_MASTER_ADMIN_EMAIL }]]);
});

test('retired master-admin cleanup refuses a matching account with a different role or level', async () => {
  for (const user of [
    { ...validUser, role: 'ADMIN' },
    { ...validUser, adminLevel: 2 },
  ]) {
    const models = makeModels(user);

    await assert.rejects(removeRetiredMasterAdmin(models), /not a level-3 master admin/);
    assert.deepEqual(models.calls, [['findOne', { email: RETIRED_MASTER_ADMIN_EMAIL }]]);
  }
});

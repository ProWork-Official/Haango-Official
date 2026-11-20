import test from 'node:test';
import assert from 'node:assert/strict';
import EmailUnsubscribe from '../src/models/EmailUnsubscribe.js';
import { getPreferences, resubscribe, unsubscribe } from '../src/controllers/emailController.js';
import {
  createEmailUnsubscribeToken,
  getEmailFromUnsubscribeToken,
} from '../src/utils/emailUnsubscribeToken.js';

test('unsubscribe tokens are normalized and cannot be changed to another address', () => {
  const token = createEmailUnsubscribeToken('Person@Example.com');

  assert.equal(getEmailFromUnsubscribeToken(token), 'person@example.com');
  assert.equal(getEmailFromUnsubscribeToken(`${token}tampered`), null);
  assert.equal(getEmailFromUnsubscribeToken('not-a-token'), null);
  assert.equal(getEmailFromUnsubscribeToken('a'.repeat(513)), null);
});

test('public unsubscribe endpoint persists opt-out only for a valid signed token', async (t) => {
  let update;
  t.mock.method(EmailUnsubscribe, 'findOneAndUpdate', async (...args) => {
    update = args;
    return {};
  });
  const token = createEmailUnsubscribeToken('person@example.com');
  let responseBody;
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  await unsubscribe({ body: { token } }, response, (error) => { throw error; });
  assert.equal(responseBody.data.unsubscribed, true);
  assert.equal(update[0].email, 'person@example.com');
  assert.ok(update[1].$set.optedOutAt instanceof Date);
  assert.deepEqual(update[1].$setOnInsert, { email: 'person@example.com' });
  assert.equal(update[2].upsert, true);

  responseBody = null;
  await unsubscribe({ body: { token: 'invalid' } }, response, (error) => { throw error; });
  assert.equal(response.statusCode, 400);
  assert.equal(responseBody.errorCode, 'INVALID_UNSUBSCRIBE_LINK');
});

test('authenticated email preferences only inspect and update the current account email', async (t) => {
  let lookup;
  let update;
  t.mock.method(EmailUnsubscribe, 'findOne', (...args) => {
    lookup = args;
    return {
      select: () => ({ lean: async () => ({ optedOutAt: new Date() }) }),
    };
  });
  t.mock.method(EmailUnsubscribe, 'findOneAndUpdate', async (...args) => {
    update = args;
    return {};
  });
  let responseBody;
  const response = {
    json(body) {
      responseBody = body;
      return this;
    },
  };
  const req = { user: { email: 'person@example.com' } };

  await getPreferences(req, response, (error) => { throw error; });
  assert.deepEqual(lookup, [{ email: 'person@example.com' }]);
  assert.equal(responseBody.data.subscribed, false);

  await resubscribe(req, response, (error) => { throw error; });
  assert.deepEqual(update[0], { email: 'person@example.com' });
  assert.deepEqual(update[1], { $set: { optedOutAt: null } });
  assert.equal(responseBody.data.subscribed, true);
});

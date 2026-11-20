import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('admin email workflow offers both sender addresses and displays the opt-out list', async () => {
  const source = await readSource('../src/Pages/AdminEmailPage.jsx');

  assert.match(source, /value="haangoofficial@gmail\.com"/);
  assert.match(source, /value="support@haango\.in"/);
  assert.match(source, /email-campaigns\/unsubscribes/);
  assert.match(source, /aria-label="Opted-out email addresses"/);
});

test('campaign unsubscribe confirmation is public and submits its token in the request body', async () => {
  const [app, page] = await Promise.all([
    readSource('../src/App.jsx'),
    readSource('../src/Pages/UnsubscribePage.jsx'),
  ]);

  assert.match(app, /<Route path="\/unsubscribe" element=\{<UnsubscribePage \/>} \/>/);
  assert.match(page, /apiRequest\('\/email\/unsubscribe'/);
  assert.match(page, /body: JSON\.stringify\(\{ token \}\)/);
  assert.match(page, /window\.location\.hash/);
  assert.match(page, /Confirm that you want to stop receiving Haango campaign emails/);
});

test('user dashboard lets the authenticated user resubscribe to campaign emails', async () => {
  const [dashboard, controller, routes] = await Promise.all([
    readSource('../src/Pages/DashboardPage.jsx'),
    readFile(new URL('../../Haango - Backend/src/controllers/emailController.js', import.meta.url), 'utf8'),
    readFile(new URL('../../Haango - Backend/src/routes/emailRoutes.js', import.meta.url), 'utf8'),
  ]);

  assert.match(dashboard, /Resubscribe to Haango emails/);
  assert.match(dashboard, /apiRequest\('\/email\/resubscribe', \{ method: 'POST' \}\)/);
  assert.match(routes, /router\.post\('\/resubscribe', requireAuth, emailController\.resubscribe\)/);
  assert.match(controller, /EmailUnsubscribe\.findOneAndUpdate\(\s*\{ email: req\.user\.email \}/);
  assert.doesNotMatch(controller, /req\.body\?\.email/);
});

test('admin email lists allow entering a custom name when creating or editing a list', async () => {
  const source = await readSource('../src/Pages/AdminEmailPage.jsx');

  assert.match(source, /aria-label="Email list name"/);
  assert.match(source, /JSON\.stringify\(\{ emails: listInput, name: listName \}\)/);
  assert.match(source, /setListName\(list\.name \|\| ''\)/);
});

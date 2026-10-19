import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('dashboard Admin metric is an actionable link to the administrators directory', async () => {
  const source = await readSource('../src/Pages/AdminPage.jsx');

  assert.match(source, /const metricPath = label === 'Admins'\s*\? '\/admin\/administrators'/);
  assert.match(source, /onClick=\{metricPath \? \(\) => onNavigate\(metricPath\) : undefined\}/);
  assert.match(source, /aria-label=\{label === 'Admins' \? 'Open admin accounts'/);
});

test('administrators directory is present in admin menu and accessible to every admin role', async () => {
  const [layout, app] = await Promise.all([
    readSource('../src/Components/AdminLayout.jsx'),
    readSource('../src/App.jsx'),
  ]);

  assert.match(layout, /\{ id: 'administrators', label: 'Admin accounts', path: '\/admin\/administrators'/);
  assert.match(
    app,
    /<Route path="\/admin\/administrators" element=\{\s*\['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'\]\.includes\(profile\?\.role\)/,
  );
});

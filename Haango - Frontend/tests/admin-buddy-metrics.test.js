import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('buddy metric cards are keyboard-accessible filters with Total buddies selected by default', async () => {
  const page = await readSource('../src/Pages/AdminAllBuddiesPage.jsx');

  assert.match(page, /const \[statusFilter, setStatusFilter\] = useState\('ALL'\)/);
  assert.match(page, /\{ id: 'ALL', label: 'Total buddies'/);
  assert.match(page, /\{ id: 'VERIFIED', label: 'Verified'/);
  assert.match(page, /\{ id: 'PENDING', label: 'Pending verification'/);
  assert.match(page, /\{ id: 'ACTIVE', label: 'Active buddies'/);
  assert.match(page, /onClick=\{\(\) => \{ setStatusFilter\(id\); setPage\(1\); \}\}/);
  assert.match(page, /aria-pressed=\{statusFilter === id\}/);
  assert.match(page, /if \(statusFilter !== 'ALL'\) params\.set\('status', statusFilter\)/);
});

test('incomplete buddy accounts are listed without exposing profile edit or verify actions', async () => {
  const page = await readSource('../src/Pages/AdminAllBuddiesPage.jsx');

  assert.match(page, /buddy\.profileMissing === true/);
  assert.match(page, /if \(!profileMissing\) openEditForm\(buddy, account\)/);
  assert.match(page, /profileMissing \? <span className="text-xs text-ink-400">—<\/span>/);
});

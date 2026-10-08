const { test } = require('node:test');
const assert = require('node:assert/strict');
const { updateStats } = require('./update-stats.cjs');
const state = () => ({ schemaVersion: 1, downloads: { baseline: 178, total: 178, assets: { '1': { name: 'Orbit.exe', observed: 4 } } } });
const release = assets => [{ draft: false, assets }];
const asset = (id, name, download_count) => ({ id, name, download_count });

test('adds only new software downloads and remains idempotent', () => {
  const input = state();
  const downloads = release([asset(1, 'Orbit.exe', 7), asset(2, 'Orbit-Workspace-1.8.6-Windows-source.zip', 2), asset(3, 'Orbit-workspace-demo-HD.mp4', 99), asset(4, 'SHA256.txt', 99)]);
  const next = updateStats(input, downloads);
  assert.equal(next.downloads.total, 183);
  assert.deepEqual(updateStats(next, downloads), next);
  assert.equal(input.downloads.total, 178);
});

test('retains credited totals when releases disappear or assets are replaced', () => {
  const credited = updateStats(state(), release([asset(1, 'Orbit.exe', 7)]));
  const replaced = updateStats(credited, release([asset(5, 'Orbit.exe', 2)]));
  assert.equal(replaced.downloads.total, 183);
  assert.equal(updateStats(replaced, []).downloads.total, 183);
  assert.equal(replaced.downloads.assets['1'].observed, 7);
});

test('does not recount a regressed API value or publish malformed counts', () => {
  const input = state();
  const lower = updateStats(input, release([asset(1, 'Orbit.exe', 1)]));
  assert.equal(lower.downloads.total, 178);
  assert.equal(updateStats(lower, release([asset(1, 'Orbit.exe', 4)])).downloads.total, 178);
  assert.throws(() => updateStats(input, release([asset(1, 'Orbit.exe', -1)])));
});

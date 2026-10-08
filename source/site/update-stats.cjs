const fs = require('node:fs');

const softwareAsset = name => /^Orbit\.exe$/i.test(name) || /^Orbit-Workspace-.*Windows[-_]source\.zip$/i.test(name);

function updateStats(previous, releases) {
  const state = structuredClone(previous);
  if (state.schemaVersion !== 1 || !Number.isSafeInteger(state.downloads?.total) || state.downloads.total < state.downloads.baseline) {
    throw new Error('Invalid statistics state; refusing to replace it.');
  }
  const ledger = state.downloads.assets;
  for (const release of releases) {
    if (release.draft) continue;
    for (const asset of release.assets || []) {
      if (!softwareAsset(asset.name)) continue;
      if (!Number.isSafeInteger(asset.id) || !Number.isSafeInteger(asset.download_count) || asset.download_count < 0) {
        throw new Error('Invalid GitHub asset count; refusing to publish partial statistics.');
      }
      const old = ledger[String(asset.id)]?.observed || 0;
      state.downloads.total += Math.max(0, asset.download_count - old);
      ledger[String(asset.id)] = { name: asset.name, observed: Math.max(old, asset.download_count) };
    }
  }
  if (JSON.stringify(state.downloads) !== JSON.stringify(previous.downloads)) state.updatedAt = new Date().toISOString();
  return state;
}

async function github(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  const response = await fetch('https://api.github.com' + path, {
    ...options,
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Orbit-Workspace-site-stats', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`GitHub statistics request failed: HTTP ${response.status}`);
  return response.json();
}

async function readReleases(repo) {
  const all = [];
  for (let page = 1; ; page++) {
    const releases = await github(`/repos/${repo}/releases?per_page=100&page=${page}`);
    if (!Array.isArray(releases)) throw new Error('Invalid GitHub releases response.');
    all.push(...releases);
    if (releases.length < 100) return all;
  }
}

async function main() {
  const args = process.argv.slice(2), repo = process.env.GITHUB_REPOSITORY || 'baiming-zhang/Orbit-Workspace';
  const publish = args.includes('--publish');
  const value = flag => args[args.indexOf(flag) + 1];
  let previous, sha;
  if (publish) {
    if (!process.env.GITHUB_TOKEN) throw new Error('Publishing requires the workflow GitHub token.');
    const file = await github(`/repos/${repo}/contents/site-stats.json?ref=gh-pages`);
    previous = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    sha = file.sha;
  } else {
    if (!args.includes('--input') || !args.includes('--output')) throw new Error('Use --input STATE --output RESULT, or --publish.');
    previous = JSON.parse(fs.readFileSync(value('--input'), 'utf8'));
  }
  const next = updateStats(previous, await readReleases(repo));
  const changed = JSON.stringify(next) !== JSON.stringify(previous);
  if (publish && changed) {
    await github(`/repos/${repo}/contents/site-stats.json`, { method: 'PUT', body: JSON.stringify({
      branch: 'gh-pages', sha, message: 'stats: sync software download totals',
      content: Buffer.from(JSON.stringify(next, null, 2) + '\n').toString('base64')
    }) });
  } else if (!publish) fs.writeFileSync(value('--output'), JSON.stringify(next, null, 2) + '\n');
  console.log(JSON.stringify({ downloads: next.downloads.total, changed, published: publish && changed }));
}

module.exports = { updateStats, softwareAsset };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });

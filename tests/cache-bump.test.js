// The shell is cache-first for everything except pages, so a changed script or data
// file only reaches returning users when the service worker's cache name moves on.
// Editing stories.js without touching sw.js is how a fix sits invisible in production.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

/** './' and './index.html' are served network-first, so they never need a bump. */
const NETWORK_FIRST = new Set(['./', './index.html']);

function shellAssets() {
  const sw = fs.readFileSync('sw.js', 'utf8');
  const line = /const SHELL = \[([\s\S]*?)\];/.exec(sw);
  assert.ok(line, 'sw.js must declare a SHELL list');
  return [...line[1].matchAll(/'([^']+)'/g)]
    .map((m) => m[1])
    .filter((p) => !NETWORK_FIRST.has(p));
}

test('a changed cache-first asset comes with a new cache version', (t) => {
  let changed;
  try {
    git('rev-parse', '--verify', 'HEAD~1');
    changed = git('diff', '--name-only', 'HEAD~1', 'HEAD')
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);
  } catch {
    // A shallow clone or the first commit: there is no previous tree to compare.
    t.skip('no earlier commit to compare against');
    return;
  }
  if (!changed.length) {
    t.skip('no files changed in the latest commit');
    return;
  }

  const assets = shellAssets().map((p) => p.replace(/^\.\//, ''));
  const touched = changed.filter((f) => assets.includes(f));
  if (!touched.length) return;

  const previousSw = git('show', 'HEAD~1:sw.js');
  const nowVersion = /const CACHE = '([^']+)'/.exec(fs.readFileSync('sw.js', 'utf8'))[1];
  const thenVersion = /const CACHE = '([^']+)'/.exec(previousSw)[1];

  assert.notStrictEqual(
    nowVersion,
    thenVersion,
    `this commit changes ${touched.join(', ')} but keeps ${nowVersion}: returning users would keep the old copy. Bump CACHE in sw.js.`,
  );
});

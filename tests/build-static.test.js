// The Vercel deployment is a whitelist copy. If a new asset is referenced by the app
// but never copied, the deployed site 404s while the repo looks fine.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');

test('the static build contains every asset the shell asks for', () => {
  execFileSync(process.execPath, [path.join(ROOT, 'tools/build-static.js')], { cwd: ROOT, stdio: 'pipe' });
  const out = path.join(ROOT, 'public');
  assert.ok(fs.existsSync(path.join(out, 'index.html')), 'index.html is published');

  // every relative file the page or the service worker references must survive the copy
  const shell = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').match(/const SHELL = \[(.*?)\]/s)[1];
  const refs = [...shell.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]).filter((r) => r && r !== '');
  for (const rel of refs) {
    const target = path.join(out, rel);
    assert.ok(fs.existsSync(target) || fs.existsSync(target.replace(/\/$/, '')), `published copy is missing ${rel}`);
  }

  // and nothing from the repo's working files leaks into the deployment
  for (const leaked of ['package.json', 'package-lock.json', 'tests', 'tools', 'node_modules', 'README.md']) {
    assert.ok(!fs.existsSync(path.join(out, leaked)), `${leaked} must not be published`);
  }
});

#!/usr/bin/env node
/**
 * Vercel publishes this project, and the app's files sit at the repo root beside
 * tests, tools and package files. Serving the root would publish those too (and,
 * once a build installs dependencies, node_modules). So the deployment is a
 * whitelist copy: only what the browser asks for lands in public/.
 *
 * GitHub Pages keeps serving the repo root unchanged; this is for Vercel only.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public');

// Copied as-is. Directories are copied whole.
const FILES = ['index.html', 'sw.js', 'manifest.webmanifest', 'quran.js', 'daily-hadith.js', 'stories.js', 'praytimes.js', 'duas.json', 'icon-192.png', 'icon-512.png'];
const DIRS = ['hadith', 'tafsir'];

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const f of FILES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) throw new Error('missing site file: ' + f);
  copy(src, path.join(OUT, f));
}
for (const d of DIRS) {
  const src = path.join(ROOT, d);
  if (!fs.existsSync(src)) continue;
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    if (fs.statSync(from).isFile()) copy(from, path.join(OUT, d, name));
  }
}

const count = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0);
console.log(`built public/ — ${count(OUT)} files`);

// Tests for tools/check-static.js, including the regressions it exists to catch.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runChecks } = require('../tools/check-static');

const REPO = path.join(__dirname, '..');

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ilm-static-'));
  for (const [name, body] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
  }
  return dir;
}

const HEALTHY = {
  'index.html': `<!doctype html><html><head>
    <link rel="manifest" href="manifest.webmanifest" />
    <script src="app.js"></script>
    <script>const SHARED = 1;</script>
    </head><body><div id="only">x</div></body></html>`,
  'app.js': 'const APP = 1;\nfunction boot() {}\n',
  // the checker treats these three as required by the real app
  'stories.js': 'const STORIES_DATA = 1;\n',
  'quran.js': 'const QURAN_DATA = 1;\n',
  'praytimes.js': 'const PT = 1;\n',
  'manifest.webmanifest': JSON.stringify({ start_url: './', icons: [{ src: 'icon-192.png', sizes: '192x192' }] }),
  'sw.js': "const CACHE = 'app-v1';\nconst SHELL = ['./', './index.html', './app.js'];\n",
  'icon-192.png': 'fake',
  'hadith/collections.json': '[]',
};

test('the real repository passes all checks', () => {
  const { errors } = runChecks(REPO);
  assert.deepStrictEqual(errors, []);
});

test('a healthy fixture passes', () => {
  const { errors } = runChecks(fixture(HEALTHY));
  assert.deepStrictEqual(errors, []);
});

test('a global declared in both an inline block and a script file is caught', () => {
  // This is the v11 boot crash: two top-level `const` with the same name.
  const dir = fixture({
    ...HEALTHY,
    'index.html': HEALTHY['index.html'].replace('const SHARED = 1;', 'const APP = 2;'),
  });
  const { errors } = runChecks(dir);
  assert.ok(errors.some((e) => e.includes('global "APP" is declared twice')), errors.join('; '));
});

test('a referenced file that does not exist is caught', () => {
  const dir = fixture({
    ...HEALTHY,
    'index.html': HEALTHY['index.html'].replace('<script src="app.js"></script>', '<script src="missing.js"></script>'),
  });
  const { errors } = runChecks(dir);
  assert.ok(errors.some((e) => e.includes('missing.js')), errors.join('; '));
});

test('a duplicate static element id is caught', () => {
  const dir = fixture({
    ...HEALTHY,
    'index.html': HEALTHY['index.html'].replace('<div id="only">x</div>', '<div id="only">x</div><div id="only">y</div>'),
  });
  const { errors } = runChecks(dir);
  assert.ok(errors.some((e) => e.includes('duplicate static element id')), errors.join('; '));
});

test('a manifest icon missing from disk is caught', () => {
  const dir = fixture(HEALTHY);
  fs.unlinkSync(path.join(dir, 'icon-192.png'));
  const { errors } = runChecks(dir);
  assert.ok(errors.some((e) => e.includes('manifest icon missing on disk')), errors.join('; '));
});

test('a service worker precaching a missing file is caught', () => {
  const dir = fixture({ ...HEALTHY, 'sw.js': "const CACHE = 'app-v1';\nconst SHELL = ['./ghost.js'];\n" });
  const { errors } = runChecks(dir);
  assert.ok(errors.some((e) => e.includes('ghost.js')), errors.join('; '));
});

test('a service worker cache name without a version suffix is caught', () => {
  const dir = fixture({ ...HEALTHY, 'sw.js': "const CACHE = 'app';\nconst SHELL = ['./'];\n" });
  const { errors } = runChecks(dir);
  assert.ok(errors.some((e) => e.includes('version suffix')), errors.join('; '));
});

test('hadith entries that are not valid JSON are caught', () => {
  const dir = fixture({
    ...HEALTHY,
    'hadith/collections.json': JSON.stringify([{ slug: 'demo', name: 'Demo', total: 2 }]),
    'hadith/demo.ndjson': '{"n":1}\nnot json at all\n',
  });
  const { errors } = runChecks(dir);
  assert.ok(errors.some((e) => e.includes('demo.ndjson') && e.includes('not valid JSON')), errors.join('; '));
});

test('a catalogue entry with no data file is caught', () => {
  const dir = fixture({
    ...HEALTHY,
    'hadith/collections.json': JSON.stringify([{ slug: 'absent', name: 'Absent', total: 1 }]),
  });
  const { errors } = runChecks(dir);
  assert.ok(errors.some((e) => e.includes('absent.ndjson is missing')), errors.join('; '));
});

'use strict';

// Static integrity checks for the Ilm Daily single-page app.
//
// The app ships as index.html plus three global scripts, so every top-level name
// lives in one shared scope. A duplicate `const` across those files is a fatal
// boot error that only shows up in a browser, which is exactly how v11 shipped
// broken. These checks run in CI instead.
//
// No dependencies: `node tools/check-static.js` prints a report and exits 1 on error.

const fs = require('node:fs');
const path = require('node:path');

const EXTERNAL_SCRIPTS = ['stories.js', 'quran.js', 'praytimes.js'];
const LOCAL_REF = /(?:src|href)="([^":#][^"]*)"/g;

function readIfExists(root, file) {
  const full = path.join(root, file);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}

function localRefs(html) {
  const out = new Set();
  let m;
  LOCAL_REF.lastIndex = 0;
  while ((m = LOCAL_REF.exec(html))) {
    const ref = m[1].trim();
    if (!ref.startsWith('http') && !ref.startsWith('data:') && !ref.startsWith('#')) out.add(ref);
  }
  return out;
}

function inlineScripts(html) {
  const blocks = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    blocks.push(m[1]);
  }
  return blocks;
}

// Only column-0 declarations are globals; anything indented sits inside a function.
function topLevelDeclarations(js) {
  const names = new Set();
  for (const m of js.matchAll(/^(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of js.matchAll(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  return names;
}

function staticIds(html) {
  const markup = html.replace(/<script[\s\S]*?<\/script>/g, '');
  const ids = [];
  for (const m of markup.matchAll(/\sid="([^"]+)"/g)) ids.push(m[1]);
  return ids;
}

function runChecks(root) {
  const errors = [];
  const warnings = [];
  const rel = (f) => path.join(root, f);

  const html = readIfExists(root, 'index.html');
  if (!html) return { errors: ['index.html is missing'], warnings };

  // 1. every local asset referenced by the page must exist
  for (const ref of localRefs(html)) {
    if (!fs.existsSync(rel(ref.replace(/^\.\//, '')))) errors.push(`index.html references a missing file: ${ref}`);
  }

  // 2. no duplicate static element ids in the markup itself
  const seen = new Map();
  for (const id of staticIds(html)) seen.set(id, (seen.get(id) || 0) + 1);
  for (const [id, count] of seen) {
    if (count > 1) errors.push(`duplicate static element id "${id}" appears ${count} times in the markup`);
  }

  // 3. no duplicate globals across the shared script scope (the v11 boot crash)
  const scope = new Map();
  const sources = [['index.html inline', inlineScripts(html)]];
  // scan every local script the page loads, plus the known trio even if unreferenced
  const scriptFiles = new Set(EXTERNAL_SCRIPTS);
  for (const ref of localRefs(html)) {
    const clean = ref.replace(/^\.\//, '');
    if (clean.endsWith('.js') && !clean.includes('/')) scriptFiles.add(clean);
  }
  for (const file of scriptFiles) {
    const js = readIfExists(root, file);
    if (js === null) errors.push(`missing script: ${file}`);
    else sources.push([file, [js]]);
  }
  for (const [label, blocks] of sources) {
    for (const js of blocks) {
      for (const name of topLevelDeclarations(js)) {
        const owner = scope.get(name);
        if (owner && owner !== label) errors.push(`global "${name}" is declared twice: ${owner} and ${label}`);
        else scope.set(name, label);
      }
    }
  }

  // 4. manifest icons must exist and be referenced with a size
  const manifestRaw = readIfExists(root, 'manifest.webmanifest');
  if (manifestRaw === null) {
    errors.push('manifest.webmanifest is missing');
  } else {
    try {
      const manifest = JSON.parse(manifestRaw);
      if (!manifest.start_url) errors.push('manifest.webmanifest has no start_url');
      if (!Array.isArray(manifest.icons) || !manifest.icons.length) errors.push('manifest.webmanifest lists no icons');
      for (const icon of manifest.icons || []) {
        if (!fs.existsSync(rel(icon.src))) errors.push(`manifest icon missing on disk: ${icon.src}`);
        if (!icon.sizes) warnings.push(`manifest icon has no sizes: ${icon.src}`);
      }
    } catch (e) {
      errors.push('manifest.webmanifest is not valid JSON: ' + e.message);
    }
  }

  // 5. the service worker shell must match reality, and be version bumped deliberately
  const sw = readIfExists(root, 'sw.js');
  if (sw === null) {
    errors.push('sw.js is missing');
  } else {
    const cacheMatch = sw.match(/const\s+CACHE\s*=\s*['"]([^'"]+)['"]/);
    if (!cacheMatch) errors.push('sw.js does not declare a CACHE name');
    else if (!/-v\d+$/.test(cacheMatch[1])) errors.push(`sw.js CACHE "${cacheMatch[1]}" does not end in a -vN version suffix`);

    const shellMatch = sw.match(/const\s+SHELL\s*=\s*\[([\s\S]*?)\]/);
    if (!shellMatch) errors.push('sw.js does not declare a SHELL list');
    else {
      const entries = [...shellMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
      for (const entry of entries) {
        if (entry === './') continue;
        if (!fs.existsSync(rel(entry.replace(/^\.\//, '')))) errors.push(`sw.js precaches a missing file: ${entry}`);
      }
      // a new top-level local script or data file should be considered for precaching
      const precached = new Set(entries.map((e) => e.replace(/^\.\//, '')));
      for (const ref of localRefs(html)) {
        const clean = ref.replace(/^\.\//, '');
        if (/\.(js|json)$/.test(clean) && !clean.includes('/') && !precached.has(clean)) {
          warnings.push(`index.html loads ${clean} but the service worker does not precache it`);
        }
      }
    }
  }

  // 6. hadith data must line up with the catalogue
  const catalogueRaw = readIfExists(root, 'hadith/collections.json');
  if (catalogueRaw === null) {
    errors.push('hadith/collections.json is missing');
  } else {
    let catalogue;
    try {
      catalogue = JSON.parse(catalogueRaw);
    } catch (e) {
      errors.push('hadith/collections.json is not valid JSON: ' + e.message);
      catalogue = [];
    }
    for (const collection of catalogue) {
      const file = `hadith/${collection.slug}.ndjson`;
      const body = readIfExists(root, file);
      if (body === null) {
        errors.push(`catalogue lists ${collection.slug} but ${file} is missing`);
        continue;
      }
      const lines = body.split('\n').filter((line) => line.trim());
      if (collection.total && Math.abs(lines.length - collection.total) > 0) {
        warnings.push(`${file} has ${lines.length} entries, catalogue says ${collection.total}`);
      }
      for (const index of [0, lines.length - 1]) {
        try {
          JSON.parse(lines[index]);
        } catch (e) {
          errors.push(`${file} line ${index + 1} is not valid JSON: ${e.message}`);
        }
      }
    }
  }

  return { errors, warnings };
}

module.exports = { runChecks };

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const { errors, warnings } = runChecks(root);
  for (const w of warnings) console.log('warning: ' + w);
  for (const e of errors) console.error('error: ' + e);
  if (errors.length) {
    console.error(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
    process.exit(1);
  }
  console.log(`OK — no errors, ${warnings.length} warning(s)`);
}

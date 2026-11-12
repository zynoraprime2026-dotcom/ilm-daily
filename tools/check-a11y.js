#!/usr/bin/env node
/**
 * Accessibility gate: load the real app in a DOM, walk every tab, and fail on
 * serious or critical axe violations.
 *
 * The app is one HTML shell whose panels are built by script, so a violation can
 * exist on a tab nobody opens during a smoke test. This walks all six.
 *
 * Needs jsdom and axe-core (dev dependencies): npm install
 * Run: node tools/check-a11y.js
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const TABS = ['prayer', 'quran', 'hadith', 'stories', 'mutoon', 'duas'];
const ROOT = path.resolve(__dirname, '..');

async function main() {
  let JSDOM;
  let VirtualConsole;
  let axeSource;
  try {
    ({ JSDOM, VirtualConsole } = require('jsdom'));
    axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  } catch {
    console.log('SKIP — jsdom or axe-core is not installed (npm install)');
    return 0;
  }

  const problems = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {});
  virtualConsole.on('error', () => {});

  const dom = await JSDOM.fromFile(path.join(ROOT, 'index.html'), {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    // A same-origin URL so relative fetches resolve the way they do in production.
    url: 'https://zynoraprime2026-dotcom.github.io/ilm-daily/index.html',
    beforeParse(window) {
      // jsdom ships no fetch. The API is a separate host from the page, so the app's own
      // network paths are stubbed out here: this gate is about markup, not the backend.
      window.fetch = () => Promise.reject(new Error('offline in the a11y gate'));
    },
  });

  const { window } = dom;
  const document = window.document;
  await new Promise((resolve) => setTimeout(resolve, 1_500));
  window.eval(axeSource);

  const seen = new Map();
  for (const tab of TABS) {
    const button = document.querySelector(`.tab[data-tab="${tab}"]`);
    if (button) button.click();
    await new Promise((resolve) => setTimeout(resolve, 600));

    const result = await window.axe.run(document.documentElement, {
      resultTypes: ['violations'],
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });

    for (const violation of result.violations) {
      if (violation.impact !== 'critical' && violation.impact !== 'serious') continue;
      const key = `${violation.id}`;
      if (!seen.has(key)) seen.set(key, { impact: violation.impact, help: violation.help, tabs: new Set(), targets: new Set() });
      const record = seen.get(key);
      record.tabs.add(tab);
      for (const node of violation.nodes.slice(0, 5)) record.targets.add(node.target.join(' '));
    }
  }

  for (const [id, record] of seen) {
    problems.push(`${record.impact} ${id} — ${record.help} [tabs: ${[...record.tabs].join(',')}] ${[...record.targets].slice(0, 4).join(' | ')}`);
  }

  if (problems.length) {
    console.error(`FAIL — ${problems.length} accessibility problem(s)`);
    for (const problem of problems) console.error('  - ' + problem);
    return 1;
  }
  console.log(`OK — no serious or critical accessibility violations across ${TABS.length} tabs`);
  return 0;
}

main().then((code) => process.exit(code)).catch((error) => {
  console.error('FAIL — the audit itself crashed:', error && error.message ? error.message : error);
  process.exit(1);
});

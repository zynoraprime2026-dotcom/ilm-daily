// "Download the full Quran" has to be one tap, cost-stated, and stop-able.
// This drives the real sheet in a DOM with a stubbed Cache Storage.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require('jsdom'));
} catch {
  JSDOM = null;
}

const HTML = fs.readFileSync('index.html', 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function boot() {
  const vc = new VirtualConsole();
  const store = new Map();
  const cache = {
    match: async (u) => store.get(String(u)) || undefined,
    put: async (u) => { store.set(String(u), { ok: true }); },
    add: async () => {},
    addAll: async () => {},
    keys: async () => [...store.keys()],
    delete: async () => true,
  };
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    virtualConsole: vc,
    url: 'https://zynoraprime2026-dotcom.github.io/ilm-daily/index.html',
    beforeParse(w) {
      w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      Object.defineProperty(w.navigator, 'onLine', { value: true, configurable: true });
      w.scrollTo = () => {};
      // stand-in for the bundled quran.js, so the sheet does not wait on a script
      w.QURAN_PACK = {
        surahs: [
          { number: 1, name_arabic: 'الفاتحة', name_english: 'The Opening', name_transliteration: 'Al-Fatihah', revelation_place: 'makkah', ayah_count: 7, ayahs: [[1, 'بسم', 'In the name']] },
          { number: 2, name_arabic: 'البقرة', name_english: 'The Cow', name_transliteration: 'Al-Baqarah', revelation_place: 'madinah', ayah_count: 286, ayahs: [[1, 'الم', 'Alif Lam Mim']] },
        ],
      };
      w.caches = { open: async () => cache, keys: async () => ['ilm-quran-audio'], delete: async () => true, match: async () => undefined };
      // every layer resolves instantly and reports success
      w.fetch = async () => ({ ok: true, status: 200, type: 'basic', json: async () => ({ ayahs: {}, tafsir: [], clip: '/x' }), clone() { return this; } });
    },
  });
  return { w: dom.window, store };
}

test('the full-Quran sheet opens, states its cost, and runs every layer', { skip: !JSDOM && 'jsdom not installed — run npm install' }, async () => {
  const { w } = boot();
  await wait(1200);
  const d = w.document;

  d.querySelector('.tab[data-tab="quran"]').click();
  await wait(1200);

  const button = d.getElementById('dlAll');
  assert.ok(button, 'the Quran tab offers one download button');
  assert.match(button.textContent, /full Quran/i);

  button.click();
  await wait(600);

  const sheet = d.getElementById('quranDlSheet');
  assert.ok(sheet, 'tapping the button opens the sheet');
  const layers = [...sheet.querySelectorAll('input[data-layer]')].map((b) => b.dataset.layer);
  assert.deepStrictEqual(layers, ['audio', 'words', 'wordAudio', 'tafsir'], 'all four layers are offered');

  // the cost is stated before anything is fetched
  assert.match(sheet.querySelector('#qdTotal').textContent, /MB/, 'the sheet says how much it will download');

  // word audio for 6236 ayahs is gigabytes, so it must be described honestly
  assert.ok(w.offlineEstimate(['wordAudio'], 6236) > 1000, 'word audio is reported at its real size');
  assert.ok(w.offlineEstimate(['audio'], 6236) < 1000, 'recitation audio stays under a gigabyte');

  // run it: one surah of work is enough to prove the loop, progress and marking
  sheet.querySelector('#qdGo').click();
  await wait(1500);

  assert.match(sheet.querySelector('#qdLabel').textContent, /surah 1\/\d+|Finished/i, 'progress names the surah it is on');
  const saved = JSON.parse(w.localStorage.getItem('ilm_offline') || '{}');
  assert.ok(Object.keys(saved).length >= 1, 'at least one surah is marked saved');
  assert.doesNotThrow(() => w.fullQuranStatusLine(), 'the status line survives the run');
});

// End-to-end check of the Hadith tab's online search, in a real DOM.
//
// It needs jsdom, which is not a dependency of this repo (the app itself ships no build
// step). It skips cleanly when jsdom is absent: `npm i jsdom` in a scratch directory and
// point NODE_PATH at it, or run it from a checkout that has one.
//
// What it pins down, because both went wrong before: the header must quote the API's
// real total (it once said "20 results" while 6483 matched), narrations with no narrator
// in the source must not render "Narrated :", the Load more button must page with an
// offset, and a narration whose text the source edition lacks must say so instead of
// rendering an empty card.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

let JSDOM = null, VirtualConsole = null;
try { ({ JSDOM, VirtualConsole } = require('jsdom')); } catch (e) { /* skipped below */ }

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function boot(fetchImpl) {
  const vc = new VirtualConsole();
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously', virtualConsole: vc, url: 'https://ilm-daily.vercel.app/',
    beforeParse(w) {
      w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      Object.defineProperty(w.navigator, 'onLine', { value: true, configurable: true });
      w.scrollTo = () => {};
      w.fetch = fetchImpl;
    }
  });
  return dom.window;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const row = (i) => ({
  id: i, collection: 'bukhari', hadith_number: String(1000 + i),
  narrator: i % 3 === 2 ? null : 'Anas',
  text_english: i === 1 ? '' : 'Narration ' + i,
  text_arabic: i === 1 ? '' : 'حَدِيث ' + i,
  grade: null, book_number: 1, book_name: 'Revelation'
});

test('hadith search: real total, honest cards, working Load more', { skip: !JSDOM && 'jsdom not installed' }, async () => {
  const calls = [];
  const w = boot(async (url) => {
    const u = String(url); calls.push(u);
    const json = (o) => ({ ok: true, json: async () => o });
    if (u.includes('/v1/hadith/collections')) return json([{ slug: 'bukhari', name: 'Sahih al-Bukhari', count: 7000 }]);
    if (u.includes('/v1/hadith/search')) {
      const offset = Number(new URL(u).searchParams.get('offset') || 0);
      return json({ count: 20, total: 98, has_more: true, results: Array.from({ length: 20 }, (_, i) => row(offset + i)) });
    }
    return json({});
  });
  const d = w.document;
  await wait(800);
  [...d.querySelectorAll('button,a,div')].find((e) => e.textContent.trim() === 'Hadith').click();
  await wait(400);
  d.getElementById('hsearch').value = 'patience';
  d.getElementById('hgo').click();
  await wait(400);

  const text = () => d.body.textContent.replace(/\s+/g, ' ');
  const list = () => d.getElementById('hlist').innerHTML;

  assert.match(text(), /Showing 20 of 98/, 'the header quotes the real total');
  assert.doesNotMatch(text(), /20 results for/, 'the old misleading count is gone');
  assert.equal(d.querySelectorAll('#hlist .hcard').length, 20);
  assert.doesNotMatch(list(), /Narrated\s*:/, 'no empty narrator label');
  assert.doesNotMatch(list(), /undefined|null/, 'no undefined leaking into a card');
  assert.match(list(), /Text not present in the source edition/);

  const more = d.getElementById('hmore');
  assert.ok(more && more.style.display !== 'none', 'Load more is offered when more exist');
  more.click();
  await wait(500);

  assert.equal(d.querySelectorAll('#hlist .hcard').length, 40, 'the second page is appended');
  assert.match(text(), /Showing 40 of 98/, 'the count follows the pages');
  assert.ok(calls.some((u) => u.includes('offset=20')), 'paging asks for an offset');
  w.close();
});

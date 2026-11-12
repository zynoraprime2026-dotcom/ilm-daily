# Ilm Daily — Prayer & Quran

Daily prayer times and Quran reader, powered by the Ilm API.
Live at: https://zynoraprime2026-dotcom.github.io/ilm-daily/

## Loading

The Quran ships inside the app (`quran.js`, 2.2 MB) but is fetched the first time the
Quran tab opens rather than on every visit, so someone checking prayer times does not
pay for it. The service worker precaches it, so it is there offline after that first
open. `ensureQuran()` in `index.html` owns that switch.

**Downloading the whole Quran.** The Quran tab's `⬇ Download the full Quran` opens one
sheet with four layers (recitation audio, word-by-word text, word audio, tafsir). It
states the remaining size before fetching, skips surahs that are already saved, runs
every surah through the same `runOfflineDownload()` the per-surah sheet uses, and can be
stopped and resumed. Word audio is several gigabytes for all 114 surahs, so it starts
unchecked there. `tests/full-quran-download.test.js` drives the sheet in a DOM with a
stubbed Cache Storage.

## Checks and tests

The app ships as one HTML shell plus three global scripts, which all share a single
scope — a duplicate top-level `const` across those files is a fatal boot error that
only shows up in the browser. That is how v11 shipped broken, so the checks below
exist to catch it before a deploy.

```bash
npm install                       # jsdom + axe-core, for the tests and the a11y gate
npm run verify                    # all three checks, in order
```

Individually:

```bash
node tools/check-static.js        # static integrity, exits 1 on error
node --test tests/*.test.js       # 13 assertions, including the hadith search test
node tools/check-a11y.js          # axe over all six tabs, fails on serious/critical
```

The hadith search test and the accessibility gate need `jsdom`. Before `package.json`
existed they skipped silently in CI (or never installed), so a green run did not mean
they had passed. CI now installs the dev dependencies and runs all three.

`tools/check-static.js` verifies:

- every local `src`/`href` in `index.html` exists on disk
- no duplicate static element ids in the markup
- no global declared twice across the inline blocks and every script the page loads
- the manifest's icons exist and `start_url` is set
- the service worker's `SHELL` entries exist and its cache name ends in `-vN`
- every catalogue entry in `hadith/collections.json` has a matching `.ndjson`, and the
  first and last entries parse as JSON

`tests/static.test.js` proves the checker still catches each of those regressions by
building throwaway fixtures, so a broken check cannot pass silently.

There is deliberately no `package.json`: this repository is deployed to Vercel as a
static site and adding one would change how the project is detected and built.

Known limit: ids inside `innerHTML` templates are not checked. The `back` and `hbody`
ids are reused across mutually exclusive views on purpose, and `hBack2` now only
appears once per rendered view.

# Ilm Daily — Prayer & Quran

Daily prayer times and Quran reader, powered by the Ilm API.
Live at: https://zynoraprime2026-dotcom.github.io/ilm-daily/

## Checks and tests

The app ships as one HTML shell plus three global scripts, which all share a single
scope — a duplicate top-level `const` across those files is a fatal boot error that
only shows up in the browser. That is how v11 shipped broken, so the checks below
exist to catch it before a deploy.

```bash
node tools/check-static.js        # static integrity, exits 1 on error
node --test tests/*.test.js       # 10 assertions
```

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

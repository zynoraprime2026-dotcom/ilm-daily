# Ilm Daily collaboration notes

### 2026-11-09 02:05 — Prime: word audio, and a bug that was deleting everyone's downloads

Word audio shipped (v27): every word in the morphology grid has a ▶ chip that plays its
own clip from audio.qurancdn.com (CORS open, ~20-45 KB each, 591 KB for all 15 clips of
Al-Ikhlaas). Saving a surah's words offers 'Add word audio' as a separate confirmed
download with clip count, MB estimate, free-space check and progress; removal is per
surah. Whole Quran would be about 3.3 GB, Al-Baqarah about 270 MB, which is why it is
opt-in and never bundled.

The pack format is versioned (WORDS_PACK_FORMAT = 2) because v1 packs had no clip file
names; a stale pack is now discarded and the button offers the download again.

THE BUG: sw.js activate deleted every cache whose name was not in a hardcoded keep
list. 'ilm-words-extra' and 'ilm-words-audio' were not, so every deploy threw away the
offline downloads users had made (and their localStorage markers survived, so the UI
went on claiming packs that no longer existed). Activate now deletes only earlier
ilm-daily-v<N> shell caches. If you add a cache bucket, you no longer need to register
it anywhere.

### 2026-11-09 02:20 — Prime: Ibn Kathir tafsir downloadable for the whole Quran (v29)

The owner asked for Kathir tafsir "to be downloaded". Only 43 surahs shipped commentary;
the other 71 needed a reader to open each surah and press a button in it, seventy-one
times, for the part of the Quran most people actually study.

Added to the Offline & storage card: a row reading "Ibn Kathir tafsir · 43 of 114 surahs
offline · 71 left" with "⬇ Download all". It fetches every missing surah, names the surah
and the percentage inside it, and commits each surah to its own cache entry as it
finishes, so an interrupted run resumes where it stopped. It confirm-asks with an honest
MB figure (5,268 ayahs across the 71, about 58 MB at the measured 11.5 KB of commentary
per ayah) and checks free space first.

Per-surah button and bulk download now share fetchTafsirSurah, so pack format, cache key
and marker live in one place. Buttons say "Ibn Kathir" instead of a vague "tafsir".
APP_VERSION 29, SW cache ilm-daily-v29.

Gotcha found while testing: quran.js loads lazily on the first Quran-tab visit, so ayah
counts are absent on a fresh phone and the row first read "about 0 MB". The card now omits
the size when counts are not loaded, and the download calls ensureQuran() before quoting
its figure. Verified live: surah 77 (previously unbundled) downloaded 50/50 and its ayah 1
renders Ibn Kathir from the pack.

### 2026-11-09 13:05 — Prime: hadith search told the truth about how much it found

Search printed "20 results for \"prayer\" — showing first 20" while the API reported 6,483
matches, so the screen looked like the library was small. `total` is the real figure and
`count` is only the page, which is where the confusion came from. The header now reads
"Showing 20 of 6483", pages arrive 20 at a time behind "Load more" (offset paging, each
page wired for Listen and Share), and the same honest card is used everywhere: a narration
the source has no narrator for no longer renders "Narrated :", and one whose text the
edition lacks says so instead of showing an empty box.

APP_VERSION 30, SW cache ilm-daily-v31 (sw.js had already gone to v30 without the app
version following, and an unchanged sw.js would have kept serving the old precached
index.html). tests/hadith-search.test.js drives the tab in a real DOM with jsdom, skips
cleanly when jsdom is absent, and pins the total, the paging offset and both honesty cases.

Verified against live ilm-api: header "Showing 20 of 98" for patience, Load more appended
20 more cards ("Showing 40 of 98"), audio for bukhari/1 returns 232 KB of audio/mpeg
through /web.

### 2026-11-09 13:20 — Prime: a laptop layout, not a phone stretched to 13 inches

Everything above 700px was one 640px column with a phone-style bottom tab bar, so on a
laptop the app sat in the middle of the window with two thirds empty. From 980px the shell
widens to 1080px, the three long list tabs (Quran surahs, hadith books, hadith results) lay
out in two columns, reading text keeps a 74ch measure so lines do not run the width of a
desk, the tab bar widens and shows labels beside the icons, and hover finally means
something on cards and rows. Phones are untouched: every rule sits inside min-width 980px.

Keyboard, since a laptop has one: 1-5 switch tabs, / jumps to the search box on the tab you
are on, Escape closes an open narration, and digits typed inside a field never hijack the
tab. The footer gains a one-line hint on wide screens only. APP_VERSION 31, SW cache
ilm-daily-v32. tests/ has no jsdom, so the shortcuts were checked in a real DOM separately;
tests/hadith-search.test.js still passes at 1/1 with jsdom present.

### 2026-11-09 13:25 — Prime: installable on a laptop, not just a phone

The install bar waited for `beforeinstallprompt` and said "Install Ilm Daily on your phone",
so a laptop either saw nothing at all (Chrome often fires that event late or not until the
second visit) or was told to reach for a phone. It now appears at once with the path that
actually exists in the browser in front of the reader: Chrome/Edge name the install icon in
the address bar and the \u22ee menu, Safari says File > Add to Dock, Firefox says plainly that
it cannot install web apps and points at Chrome or Edge. The moment the browser does offer
its prompt, the instructions collapse into one button reading "Install on this laptop".
Copy is device-aware again for phones, including the iPhone Share path.

The manifest was the other half: orientation was pinned to portrait (wrong for a laptop
window), there was no id, no display_override and no shortcuts. It now carries `id`,
`orientation: any`, `display_override: [standalone, minimal-ui]`, categories, and three icon
shortcuts (Quran, Hadith, Du'as). Shortcuts are only useful if the app honours them, so the
boot reads `?tab=` and opens that tab; offline, navigation falls back to the cached shell
because SW navigation already matches with ignoreSearch.

The Offline & storage card gains an "App window" row: it says whether you are in an installed
window or a browser tab, and "How to install" reopens the bar (a dismissal is remembered, so
there had been no way back). On screens 980px and up the bar sits in the flow instead of
floating over the tab bar. APP_VERSION 32, SW cache ilm-daily-v33.

Verified in a DOM harness, 25/25: Chrome laptop shows the address-bar instructions with no
phone wording, a simulated prompt turns it into the laptop button and accepting hides the
bar, Firefox gets the cannot-install message, Safari gets Add to Dock, iPhone gets Add to
Home Screen, dismissal persists and the storage-card button brings the bar back, ?tab=hadith
boots into Hadith and a bogus ?tab= falls back to Prayer, and the manifest still has
standalone display with 192/512 icons.

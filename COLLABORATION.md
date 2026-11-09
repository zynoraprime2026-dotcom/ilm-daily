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

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

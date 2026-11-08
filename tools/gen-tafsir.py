#!/usr/bin/env python3
"""Bundle Ibn Kathir + Maarif-ul-Quran tafsir for the surahs people actually open,
so ayah tafsir reads with no network. One file per surah, lazy-loaded by the app.

The upstream API intermittently answers with an error instead of commentary, so every
ayah is retried and any surah that comes back suspiciously empty is written only after
a second pass. Commentators also skip some verses (they cover a range in one entry),
which is why a surah can legitimately hold fewer entries than it has ayahs.
"""
import json, os, time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = os.environ.get('ILM_BASE', 'https://ilm-api.vercel.app')
KEY = os.environ.get('ILM_API_KEY', '')
SURAHS = [1, 18, 36, 55, 56, 67] + list(range(78, 115))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tafsir')


def get(url):
    req = urllib.request.Request(url, headers={'x-api-key': KEY})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return json.load(r)
    except Exception as e:
        return {'error': str(e)}


def ayah_counts():
    import re
    src = open(os.path.join(ROOT, 'quran.js'), encoding='utf-8').read()
    i = src.index('var QURAN_PACK = ') + len('var QURAN_PACK = ')
    pack = json.loads(src[i:src.rindex('}') + 1])
    return {s['number']: s['ayah_count'] for s in pack['surahs']}


def one_ayah(surah, ayah):
    """Retry until the API gives a real answer (entries, or a valid empty body)."""
    for attempt in range(5):
        d = get(f'{BASE}/web/v1/tafsir/{surah}/{ayah}')
        if 'error' not in d:
            return [{ 'source': t.get('source') or '', 'text': t.get('text') or '' }
                    for t in (d.get('tafsir') or []) if t.get('text')]
        time.sleep(1.2 * (attempt + 1))
    return None  # unresolved: caller retries the whole ayah again later


def one_surah(surah, total):
    ayahs = {}
    for a in range(1, total + 1):
        entries = one_ayah(surah, a)
        if entries is None:
            entries = one_ayah(surah, a)  # second pass
        if entries:
            ayahs[str(a)] = entries
    return surah, ayahs, total


def main():
    counts = ayah_counts()
    os.makedirs(OUT, exist_ok=True)
    jobs = [(s, counts[s]) for s in SURAHS]
    print('surahs:', len(jobs), '| ayahs:', sum(t for _, t in jobs), flush=True)
    with ThreadPoolExecutor(max_workers=6) as ex:
        for surah, ayahs, total in ex.map(lambda j: one_surah(*j), jobs):
            with open(os.path.join(OUT, f'{surah}.json'), 'w', encoding='utf-8') as f:
                json.dump({'surah': surah, 'ayahs': ayahs}, f, ensure_ascii=False, separators=(',', ':'))
            flag = '' if len(ayahs) else '  <-- EMPTY, needs a rerun'
            print(f'{surah}: {len(ayahs)}/{total}{flag}', flush=True)
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump({'surahs': SURAHS, 'sources': ['Ibn Kathir', 'Maarif-ul-Quran']}, f)


if __name__ == '__main__':
    main()

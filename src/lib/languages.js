/* ==========================================================================
   Language names.

   The forum accepts every ISO 639-1 language, so hardcoding 183 names in each
   locale is not on. `Intl.DisplayNames` already ships that table in the
   browser, translated into whatever language the interface is in, so we ask it
   and keep the backend's English label only as a fallback.
   ========================================================================== */

const cache = new Map();

function displayNames(locale) {
  if (cache.has(locale)) return cache.get(locale);
  let instance;
  try {
    instance = new Intl.DisplayNames([locale], { type: 'language' });
  } catch {
    instance = null; // very old browser, or an unusable locale tag
  }
  cache.set(locale, instance);
  return instance;
}

/* The language's name in the reader's own language: "German" in EN,
   "Germană" in RO. Falls back to the backend label, then the raw code. */
export function languageName(code, locale = 'en', fallback = '') {
  if (!code) return fallback;
  const dn = displayNames(locale);
  try {
    const name = dn?.of(code);
    // Intl echoes the input back when it has no entry — that is not a name
    if (name && name.toLowerCase() !== code.toLowerCase()) return name;
  } catch {
    /* fall through to the label below */
  }
  return fallback || code.toUpperCase();
}

/* Endonym — the language's name in itself ("Deutsch", "Română"). Used as a
   subtitle so a speaker recognises their own language even when the interface
   is in one they don't read. */
export function languageEndonym(code, fallback = '') {
  return languageName(code, code, fallback);
}

/* True when the endonym is worth showing next to the translated name. Many
   locales differ only in case ("zulu" vs "Zulu"), which is the same word twice. */
export function hasDistinctEndonym(code, locale, fallback = '') {
  const endonym = languageEndonym(code, fallback);
  return endonym.toLowerCase() !== languageName(code, locale, fallback).toLowerCase();
}

/* Match against everything a person might type: the localized name, the
   endonym, the English label and the code itself. */
export function languageMatches(lang, term, locale) {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  const code = lang.code || '';
  return (
    code.toLowerCase().startsWith(q)
    || languageName(code, locale, lang.label).toLowerCase().includes(q)
    || languageEndonym(code, lang.label).toLowerCase().includes(q)
    || (lang.label || '').toLowerCase().includes(q)
  );
}

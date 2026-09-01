import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  languageName, languageEndonym, languageMatches, hasDistinctEndonym,
} from '../lib/languages';
import './LanguagePicker.css';

/* ==========================================================================
   LanguagePicker — search-and-pick over every ISO 639-1 language.

   183 options cannot be a row of buttons, so this is a search box over a
   scrolling list. Languages that already have posts float to the top under a
   heading: those are the subforums that actually exist, and they are what
   almost everyone wants. The rest are still one search away, which is how you
   open a subforum in a language nobody has written in yet.
   ========================================================================== */
export default function LanguagePicker({
  all = [],
  active = [],
  value,
  onPick,
  autoFocus = false,
}) {
  const { t, i18n } = useTranslation();
  const [term, setTerm] = useState('');
  const inputRef = useRef(null);
  const locale = i18n.language || 'en';

  const counts = useMemo(
    () => Object.fromEntries(active.map((l) => [l.code, l.posts])),
    [active],
  );

  const { live, rest } = useMemo(() => {
    const matched = all.filter((l) => languageMatches(l, term, locale));
    const byName = (a, b) => languageName(a.code, locale, a.label)
      .localeCompare(languageName(b.code, locale, b.label), locale);
    return {
      live: matched.filter((l) => counts[l.code] > 0)
        .sort((a, b) => counts[b.code] - counts[a.code]),
      rest: matched.filter((l) => !counts[l.code]).sort(byName),
    };
  }, [all, term, locale, counts]);

  const row = (l) => (
    <button
      key={l.code}
      type="button"
      className={`lpick__row ${value === l.code ? 'is-active' : ''}`}
      aria-pressed={value === l.code}
      onClick={() => onPick(l.code)}
    >
      <span className="lpick__code" aria-hidden="true">{l.code.toUpperCase()}</span>
      <span className="lpick__text">
        <b>{languageName(l.code, locale, l.label)}</b>
        {/* the endonym is only worth showing when it differs from the
            translated name — otherwise it is the same word twice */}
        {hasDistinctEndonym(l.code, locale, l.label) && (
          <small>{languageEndonym(l.code, l.label)}</small>
        )}
      </span>
      {counts[l.code] > 0 && <em>{counts[l.code]}</em>}
    </button>
  );

  return (
    <div className="lpick">
      <div className="lpick__search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t('forum.languageSearchPh')}
          aria-label={t('forum.languageSearchPh')}
          autoFocus={autoFocus}
        />
      </div>

      <div className="lpick__list">
        {live.length > 0 && (
          <>
            <p className="lpick__heading">{t('forum.activeSubforums')}</p>
            {live.map(row)}
          </>
        )}

        {rest.length > 0 && (
          <>
            <p className="lpick__heading">
              {live.length > 0 ? t('forum.otherLanguages') : t('forum.allLanguagesHeading')}
            </p>
            {rest.map(row)}
          </>
        )}

        {live.length === 0 && rest.length === 0 && (
          <p className="lpick__empty">{t('forum.noLanguageMatch')}</p>
        )}
      </div>
    </div>
  );
}

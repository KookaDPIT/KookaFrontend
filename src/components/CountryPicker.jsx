import { useMemo, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { COUNTRY_OPTIONS, countryOf } from '../data/countries';
import './CountryPicker.css';

/* Searchable country dropdown. value/onChange use ISO alpha-3 codes. */
export default function CountryPicker({ value, onChange, placeholder }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef(null);

  const selected = value ? countryOf(value) : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.c3.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (c) => {
    onChange(c.c3);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="cpick" ref={boxRef}>
      <button type="button" className="cpick__control" onClick={() => setOpen((v) => !v)}>
        {selected ? (
          <span className="cpick__value">
            <span className="cpick__flag">{selected.flag}</span>
            {selected.name}
          </span>
        ) : (
          <span className="cpick__ph">{placeholder || t('create.originPh')}</span>
        )}
        <span className="cpick__caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="cpick__menu">
          <input
            className="cpick__search"
            autoFocus
            placeholder={t('create.originSearch')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="cpick__list">
            {filtered.map((c) => (
              <li key={c.c3}>
                <button
                  type="button"
                  className={`cpick__opt ${value === c.c3 ? 'is-sel' : ''}`}
                  onClick={() => pick(c)}
                >
                  <span className="cpick__flag">{c.flag}</span>
                  {c.name}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="cpick__empty">{t('common.none')}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import WorldGlobe from './WorldGlobe';
import { countryOf } from '../data/countries';
import './PassportGlobe.css';

/* Rotating globe that highlights the countries a cook has stamped.
   `countries` is the passport payload: [{ country: 'ITA', count }]. */
export default function PassportGlobe({ open, onClose, countries = [] }) {
  const { t } = useTranslation();

  const visited = useMemo(() => countries.map((c) => c.country), [countries]);

  // Mounting the globe (and its geojson) only when open keeps the modal light.
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={t('passport.title')}>
      <p className="pglobe__sub">{t('passport.subtitle', { count: countries.length })}</p>

      <div className="pglobe__map">
        <WorldGlobe visited={visited} />
      </div>
      <p className="pglobe__hint">{t('passport.spin')}</p>

      {countries.length === 0 ? (
        <p className="pglobe__empty">{t('passport.empty')}</p>
      ) : (
        <ul className="pglobe__stamps">
          {countries.map((c) => {
            const info = countryOf(c.country);
            return (
              <li className="pglobe__stamp" key={c.country}>
                <span className="pglobe__flag">{info.flag}</span>
                <span className="pglobe__name">{info.name}</span>
                <span className="pglobe__count">{t('passport.recipes', { count: c.count })}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

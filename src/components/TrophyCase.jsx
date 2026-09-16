import { useTranslation } from 'react-i18next';
import TrophyMedal from './TrophyMedal';
import './TrophyCase.css';

/* ==========================================================================
   The trophy case — every trophy, grouped by metal, PlayStation style.

   Platinum first and alone: it is the only one whose condition is the other
   sixty-four, so it belongs above them as the header of the shelf rather than
   as the last row of a grid.

   Hidden trophies are shown as blanks rather than left out. A list that ends at
   "45 of 45" hides the fact that there is more; a list with blanks in it is an
   invitation.
   ========================================================================== */

const ORDER = ['bronze', 'silver', 'gold', 'hidden'];

function Trophy({ trophy }) {
  const { t } = useTranslation();
  const secret = trophy.hidden && !trophy.earned;

  /* The backend sends English. Romanian lives in i18n under `trophies.<id>`;
     where a translation is missing the API's own text is the fallback, so a
     new trophy is readable the moment it ships. */
  const name = secret ? '???' : t(`trophies.${trophy.id}.name`, trophy.name);
  const desc = secret
    ? t('trophies.secretHint')
    : t(`trophies.${trophy.id}.desc`, trophy.description);

  const pct = trophy.progress
    ? Math.round((trophy.progress.current / trophy.progress.target) * 100)
    : 0;

  return (
    <li className={`tcase__item ${trophy.earned ? 'is-earned' : ''} ${secret ? 'is-secret' : ''}`}>
      <TrophyMedal tier={trophy.tier} earned={trophy.earned} secret={secret} size={56} />
      <div className="tcase__text">
        <b className="tcase__name">{name}</b>
        <span className="tcase__desc">{desc}</span>

        {/* The bar is for what you are working towards. An earned trophy shows
            the date instead — the interesting fact then is when, not how far. */}
        {trophy.earned ? (
          trophy.earned_at && (
            <span className="tcase__when">
              {new Date(trophy.earned_at).toLocaleDateString()}
            </span>
          )
        ) : trophy.progress ? (
          <span className="tcase__bar" title={`${trophy.progress.current} / ${trophy.progress.target}`}>
            <i style={{ width: `${pct}%` }} />
            <em>{trophy.progress.current} / {trophy.progress.target}</em>
          </span>
        ) : null}
      </div>
    </li>
  );
}

export default function TrophyCase({ data, loading = false }) {
  const { t } = useTranslation();

  if (loading || !data) return <p className="tcase__state">{t('common.loading')}…</p>;

  const byTier = (tier) => data.trophies.filter((x) => x.tier === tier);
  const platinum = data.trophies.find((x) => x.tier === 'platinum');

  return (
    <div className="tcase">
      {platinum && (
        <section className={`tcase__plat ${platinum.earned ? 'is-earned' : ''}`}>
          <TrophyMedal tier="platinum" earned={platinum.earned} size={76} />
          <div className="tcase__plat-text">
            <b>{t('trophies.master_chef.name', platinum.name)}</b>
            <span>{t('trophies.master_chef.desc', platinum.description)}</span>
            <span className="tcase__plat-count">
              {t('trophies.overall', { earned: data.earned, total: data.total })}
            </span>
          </div>
        </section>
      )}

      {ORDER.map((tier) => {
        const items = byTier(tier);
        if (items.length === 0) return null;
        const totals = data.totals?.[tier] || { earned: 0, total: items.length };
        return (
          <section className="tcase__group" key={tier}>
            <h3 className="tcase__group-head">
              <TrophyMedal tier={tier} earned size={24} />
              {t(`trophies.tiers.${tier}`)}
              <span className="tcase__group-count">{totals.earned}/{totals.total}</span>
            </h3>
            <ul className="tcase__list">
              {items.map((x) => <Trophy trophy={x} key={x.id} />)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

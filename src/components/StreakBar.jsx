import { useTranslation } from 'react-i18next';
import './StreakBar.css';

/* ==========================================================================
   StreakBar — the four streaks, side by side.

   Three habits and the one that needs all three on the same day:

     lessons  finish a lesson
     daily    claim a daily challenge
     cooking  cook anything you like, and have the photo confirmed
     supreme  all three, same day

   Each tile shows the running count and the last seven days as a track of
   dots. The number alone says "4"; the track says where it broke and whether
   today is still open, which is most of why anybody looks at a streak.

   A streak stays alive on the day after its last tick — see the backend's
   `at_risk`. That state gets its own colour here rather than a warning icon:
   it is a nudge, not an error.
   ========================================================================== */

/* Drawn rather than emoji: emoji render differently on every platform, and a
   row of four of them at 22px would not read as one set. */
const ICONS = {
  lessons: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
    </>
  ),
  daily: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" />
    </>
  ),
  cooking: (
    <>
      <path d="M5 11h14v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z" />
      <path d="M8.5 7.5c0-1 1-1.4 1-2.5M12 7.5c0-1 1-1.4 1-2.5M15.5 7.5c0-1 1-1.4 1-2.5" />
    </>
  ),
  supreme: (
    <>
      <path d="M5 8.5 8.5 11 12 5l3.5 6L19 8.5 17.5 18h-11z" />
      <path d="M6.5 20h11" />
    </>
  ),
};

const ORDER = ['lessons', 'daily', 'cooking', 'supreme'];

function Tile({ kind, data, label, hint }) {
  const count = data?.current || 0;
  const week = data?.week || [];
  const state = !count ? 'idle' : data.at_risk ? 'risk' : 'live';

  return (
    <li className={`streaks__tile streaks__tile--${kind} is-${state}`} title={hint}>
      <span className="streaks__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">{ICONS[kind]}</svg>
      </span>

      <span className="streaks__body">
        <b className="streaks__count">{count}</b>
        <span className="streaks__label">{label}</span>
      </span>

      {/* oldest day first, today last — the same order you read a week in */}
      <span className="streaks__week" aria-hidden="true">
        {week.map((on, i) => (
          <i
            key={i}
            className={`streaks__day ${on ? 'is-on' : ''} ${i === week.length - 1 ? 'is-today' : ''}`}
          />
        ))}
      </span>
    </li>
  );
}

export default function StreakBar({ streaks, loading = false }) {
  const { t } = useTranslation();

  /* Nothing to show is not the same as nothing to say: a brand-new cook has
     four zeroes, and four zeroes with labels explain the game better than an
     empty space would. The bar only disappears while the call is in flight. */
  if (loading || !streaks) return null;

  return (
    <section className="streaks" aria-label={t('streaks.title')}>
      <h2 className="streaks__title">{t('streaks.title')}</h2>
      <ul className="streaks__list">
        {ORDER.map((kind) => (
          <Tile
            key={kind}
            kind={kind}
            data={streaks[kind]}
            label={t(`streaks.kinds.${kind}`)}
            hint={
              streaks[kind]?.at_risk
                ? t('streaks.atRisk', { hint: t(`streaks.hints.${kind}`) })
                : t(`streaks.hints.${kind}`)
            }
          />
        ))}
      </ul>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUser, refreshUser, logout as logoutUser } from '../../user';
import './Suspended.css';

/* ==========================================================================
   SUSPENDED — the wall a suspended account hits instead of the app.

   The sanction lived only in the database before: the API refused every write
   while the interface behaved as if nothing had happened, so the person just
   saw things fail for no stated reason. This page is the explanation, and the
   guard in AppLayout sends them here from anywhere in the app.

   It re-checks on its own: when the clock runs out the account should come
   back without anyone having to log out and in again.
   ========================================================================== */

function remaining(untilIso) {
  if (!untilIso) return null;
  const ms = new Date(untilIso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  return { days, hours, minutes: mins % 60 };
}

export default function Suspended() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [me] = useUser();
  const [left, setLeft] = useState(() => remaining(me?.suspended_until));

  const until = me?.suspended_until;

  /* Tick the countdown, and ask the server again the moment it reaches zero —
     the client clock is not the authority on when a sanction ends. */
  useEffect(() => {
    const id = window.setInterval(async () => {
      const next = remaining(until);
      setLeft(next);
      if (!next) {
        const fresh = await refreshUser();
        if (fresh && !fresh.suspended) navigate('/home', { replace: true });
      }
    }, 30000);
    return () => window.clearInterval(id);
  }, [until, navigate]);

  // an account whose suspension already expired has no business on this page
  useEffect(() => {
    if (me && !me.suspended) navigate('/home', { replace: true });
  }, [me, navigate]);

  const logout = () => {
    logoutUser();
    navigate('/login', { replace: true });
  };

  const untilText = until
    ? new Date(until).toLocaleString(i18n.language, {
      dateStyle: 'long', timeStyle: 'short',
    })
    : '';

  return (
    <div className="susp">
      <div className="susp__card">
        <span className="susp__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>

        <h1 className="susp__title">{t('suspended.title')}</h1>
        <p className="susp__lead">{t('suspended.lead')}</p>

        <div className="susp__until">
          <span className="susp__untilLabel">{t('suspended.untilLabel')}</span>
          <b className="susp__untilValue">{untilText}</b>
          {left && (
            <span className="susp__countdown">
              {left.days > 0 && `${t('suspended.days', { count: left.days })} · `}
              {t('suspended.hours', { count: left.hours })}
              {left.days === 0 && ` · ${t('suspended.minutes', { count: left.minutes })}`}
            </span>
          )}
        </div>

        <ul className="susp__what">
          <li>{t('suspended.rule1')}</li>
          <li>{t('suspended.rule2')}</li>
          <li>{t('suspended.rule3')}</li>
        </ul>

        <div className="susp__actions">
          <button
            type="button"
            className="susp__btn susp__btn--ghost"
            onClick={async () => {
              const fresh = await refreshUser();
              if (fresh && !fresh.suspended) navigate('/home', { replace: true });
            }}
          >
            {t('suspended.recheck')}
          </button>
          <button type="button" className="susp__btn" onClick={logout}>
            {t('settings.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}

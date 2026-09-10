import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getModerationStats } from '../../services/admin';
import './AdminDashboard.css';

/* ==========================================================================
   MODERATION DASHBOARD — what is happening, on one screen.

   The console could only ever show you what was in front of you: a queue of
   flagged recipes, a search box for accounts. There was no way to tell a quiet
   week from a wave, or to notice that signups had stopped. This answers three
   questions in order of urgency: what needs me, how big is this place, and
   which way is it moving.

   All of it comes from one request (GET /admin/stats) — a summary that needs
   six round-trips is a summary nobody opens.
   ========================================================================== */

/* Bars rather than a line: fourteen daily counts are discrete events, and at
   this size a line would imply a continuity the data does not have. Drawn as
   plain divs — a chart library for fourteen numbers is not a trade worth
   making. */
function Sparkbars({ series, label, tone }) {
  const peak = Math.max(1, ...series.map((d) => d.count));
  const total = series.reduce((sum, d) => sum + d.count, 0);
  return (
    <div className={`dash-spark dash-spark--${tone}`}>
      <div className="dash-spark__head">
        <span className="dash-spark__label">{label}</span>
        <b className="dash-spark__total">{total}</b>
      </div>
      <div className="dash-spark__bars">
        {series.map((d) => (
          <span
            key={d.date}
            className={d.count === 0 ? 'is-empty' : ''}
            /* a zero day still gets a visible sliver, so a gap reads as
               "nothing happened" rather than as missing data */
            style={{ height: `${Math.max(6, (d.count / peak) * 100)}%` }}
            title={`${d.date}: ${d.count}`}
          />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="dash-stat">
      <b className="dash-stat__value">{value}</b>
      <span className="dash-stat__label">{label}</span>
      {note && <small className="dash-stat__note">{note}</small>}
    </div>
  );
}

export default function AdminDashboard({ onOpenPane }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);
  // bumping this is the whole of "reload" — the effect owns the request, so
  // nothing sets state synchronously on the way in
  const [reloadTick, setReloadTick] = useState(0);
  const load = () => setReloadTick((n) => n + 1);

  useEffect(() => {
    let alive = true;
    getModerationStats()
      .then((data) => {
        if (!alive) return;
        setStats(data);
        setError(false);
      })
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [reloadTick]);

  if (error) {
    return (
      <div className="dash">
        <p className="adm-empty">{t('common.error')}</p>
        <button type="button" className="dash-refresh" onClick={load}>
          {t('common.retry')}
        </button>
      </div>
    );
  }
  if (!stats) return <p className="adm-empty">{t('common.loading')}…</p>;

  const { totals, week, queues, accounts, series } = stats;
  const queueTotal = queues.flagged_recipes + queues.hidden_recipes + queues.hidden_posts;

  return (
    <div className="dash">
      {/* ---- 1. what needs a moderator right now ---- */}
      <section className="dash-block">
        <h3 className="dash-block__title">{t('admin.dash.needsYou')}</h3>
        {queueTotal === 0 ? (
          <p className="dash-clear">✓ {t('admin.dash.allClear')}</p>
        ) : (
          <div className="dash-queues">
            <button
              type="button"
              className={`dash-queue ${queues.flagged_recipes ? 'is-hot' : ''}`}
              onClick={() => onOpenPane('recipes')}
            >
              <b>{queues.flagged_recipes}</b>
              <span>{t('admin.dash.flaggedRecipes')}</span>
            </button>
            <button type="button" className="dash-queue" onClick={() => onOpenPane('recipes')}>
              <b>{queues.hidden_recipes}</b>
              <span>{t('admin.dash.hiddenRecipes')}</span>
            </button>
            <button type="button" className="dash-queue" onClick={() => onOpenPane('forum')}>
              <b>{queues.hidden_posts}</b>
              <span>{t('admin.dash.hiddenPosts')}</span>
            </button>
          </div>
        )}
      </section>

      {/* ---- 2. how big is this place ---- */}
      <section className="dash-block">
        <h3 className="dash-block__title">{t('admin.dash.community')}</h3>
        <div className="dash-stats">
          <Stat
            label={t('admin.dash.people')}
            value={totals.users}
            note={t('admin.dash.thisWeek', { count: week.users })}
          />
          <Stat
            label={t('admin.dash.recipes')}
            value={totals.recipes}
            note={t('admin.dash.thisWeek', { count: week.recipes })}
          />
          <Stat
            label={t('admin.dash.posts')}
            value={totals.posts}
            note={t('admin.dash.thisWeek', { count: week.posts })}
          />
          <Stat label={t('admin.dash.comments')} value={totals.comments} />
          <Stat
            label={t('admin.dash.reviews')}
            value={totals.reviews}
            note={t('admin.dash.thisWeek', { count: week.reviews })}
          />
          <Stat label={t('admin.dash.cooks')} value={totals.cooks_verified} />
        </div>
        <p className="dash-note">{t('admin.dash.activePeople', { count: week.active_people })}</p>
      </section>

      {/* ---- 3. which way is it moving ---- */}
      <section className="dash-block">
        <h3 className="dash-block__title">{t('admin.dash.trend')}</h3>
        <div className="dash-sparks">
          <Sparkbars series={series.signups} label={t('admin.dash.trendSignups')} tone="a" />
          <Sparkbars series={series.recipes} label={t('admin.dash.trendRecipes')} tone="b" />
          <Sparkbars series={series.posts} label={t('admin.dash.trendPosts')} tone="c" />
        </div>
      </section>

      {/* ---- 4. sanctions currently in force ---- */}
      <section className="dash-block">
        <h3 className="dash-block__title">{t('admin.dash.sanctions')}</h3>
        <div className="dash-stats dash-stats--small">
          <Stat label={t('admin.dash.suspended')} value={accounts.suspended} />
          <Stat label={t('admin.dash.deactivated')} value={accounts.deactivated} />
          <Stat label={t('admin.dash.staff')} value={accounts.staff} />
        </div>
      </section>

      {/* ---- 5. two short lists, for context rather than action ---- */}
      <div className="dash-lists">
        <section className="dash-block">
          <h3 className="dash-block__title">{t('admin.dash.topRecipes')}</h3>
          {stats.top_recipes.length === 0 ? (
            <p className="dash-note">{t('admin.dash.empty')}</p>
          ) : (
            <ul className="dash-list">
              {stats.top_recipes.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => navigate(`/recipe/${r.id}`)}>
                    <span
                      className="dash-list__photo"
                      aria-hidden="true"
                      style={r.image_url ? { backgroundImage: `url(${r.image_url})` } : undefined}
                    />
                    <span className="dash-list__text">
                      <b>{r.title}</b>
                      <small>
                        ★ {r.avg_rating} · {t('admin.dash.reviewsCount', { count: r.review_count })}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-block">
          <h3 className="dash-block__title">{t('admin.dash.newest')}</h3>
          {stats.newest_users.length === 0 ? (
            <p className="dash-note">{t('admin.dash.empty')}</p>
          ) : (
            <ul className="dash-list">
              {stats.newest_users.map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => navigate(`/profile/${u.id}`)}>
                    <span
                      className="dash-list__photo dash-list__photo--round"
                      aria-hidden="true"
                      style={u.avatar_url ? { backgroundImage: `url(${u.avatar_url})` } : undefined}
                    >
                      {!u.avatar_url && (u.full_name || u.username || '?')[0].toUpperCase()}
                    </span>
                    <span className="dash-list__text">
                      <b>{u.full_name || u.username}</b>
                      <small>@{u.username} · {t(`roles.${u.role}`)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <button type="button" className="dash-refresh" onClick={load}>
        {t('admin.dash.refresh')}
      </button>
    </div>
  );
}

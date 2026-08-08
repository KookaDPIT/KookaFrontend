import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listRecipes, getDailyDish } from '../../services/recipes';
import { listReviews } from '../../services/reviews';
import { getPassport } from '../../services/users';
import { useUser } from '../../user';
import { countryOf } from '../../data/countries';
import RecipeCard from '../../components/RecipeCard';
import PassportGlobe from '../../components/PassportGlobe';
import Stars from '../../components/Stars';
import './Home.css';

function Skeleton({ className = '', style }) {
  return <span className={`skl ${className}`} style={style} aria-hidden="true" />;
}

const FILTERS = [
  { key: 'recommended', filter: '' },
  { key: 'under30', filter: 'under30' },
  { key: 'fridge', filter: '' },
  { key: 'allergyFree', filter: '' },
  { key: 'topRated', filter: 'top_rated' },
];

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user] = useUser();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(0);

  const [daily, setDaily] = useState(undefined); // undefined = loading, null = none
  const [feed, setFeed] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [passport, setPassport] = useState([]);
  const [showGlobe, setShowGlobe] = useState(false);

  // daily dish (once)
  useEffect(() => {
    getDailyDish().then(setDaily).catch(() => setDaily(null));
  }, []);

  // feed (on filter change) — reset happens in the chip handler, so the effect
  // never calls setState synchronously (react-hooks/set-state-in-effect).
  useEffect(() => {
    let alive = true;
    listRecipes({ filter: FILTERS[activeFilter].filter, limit: 8 })
      .then((r) => alive && setFeed(r))
      .catch(() => alive && setFeed([]));
    return () => {
      alive = false;
    };
  }, [activeFilter]);

  const pickFilter = (i) => {
    setActiveFilter(i);
    setFeed(null); // show skeletons while the new filter loads
  };

  // fresh reviews = reviews of the daily dish
  useEffect(() => {
    if (daily?.id) {
      listReviews(daily.id).then((r) => setReviews(r.items || [])).catch(() => setReviews([]));
    }
  }, [daily?.id]);

  // passport (when user id known)
  useEffect(() => {
    if (user?.id) {
      getPassport(user.id).then((p) => setPassport(p.countries || [])).catch(() => setPassport([]));
    }
  }, [user?.id]);

  const onSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  const dailyCountry = daily?.origin ? countryOf(daily.origin) : null;

  return (
    <div className="home">
      {/* ===== HERO — daily global dish ================================= */}
      <header className="home-hero">
        <div
          className="home-hero__photo"
          aria-hidden="true"
          style={daily?.image_url ? { backgroundImage: `url(${daily.image_url})` } : undefined}
        />

        <div className="home-hero__inner">
          <div className="home-topbar">
            <div className="home-brand">
              <span className="home-brand__mark">KOOKA</span>
            </div>

            <form className="home-search" onSubmit={onSearch} role="search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.2-3.2" />
              </svg>
              <input
                type="search"
                placeholder={t('home.searchPh')}
                aria-label={t('home.searchAria')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>

            <div className="home-topbar__meta">
              <span className="home-level">Lvl {user?.level ?? 1}</span>
              <Link to="/profile" className="home-avatar" aria-label={t('home.yourProfile')}
                style={user?.avatar_url ? { backgroundImage: `url(${user.avatar_url})` } : undefined}
              />
            </div>
          </div>

          {/* daily dish */}
          <div className="home-daily">
            <span className="home-daily__badge">
              {t('home.dailyDish')}
              {dailyCountry && <span className="home-daily__flag">{dailyCountry.flag}</span>}
            </span>

            {daily === undefined ? (
              <div className="home-daily__title">
                <Skeleton className="skl--h1" style={{ width: '58%' }} />
                <Skeleton className="skl--h1" style={{ width: '42%' }} />
              </div>
            ) : daily === null ? (
              <>
                <h1 className="home-daily__h1">{t('home.dailyEmpty')}</h1>
                <div className="home-daily__actions">
                  <button type="button" className="home-btn home-btn--primary" onClick={() => navigate('/create')}>
                    {t('home.createRecipe')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="home-daily__h1">{daily.title}</h1>
                <p className="home-daily__meta">
                  {[daily.meta?.time, daily.meta?.kcal, dailyCountry?.name].filter(Boolean).join(' · ')}
                </p>
                <div className="home-daily__actions">
                  <button
                    type="button"
                    className="home-btn home-btn--primary"
                    onClick={() => navigate(`/recipe/${daily.id}/cook`)}
                  >
                    {t('home.startCooking')}
                  </button>
                  <button
                    type="button"
                    className="home-btn home-btn--ghost"
                    onClick={() => navigate(`/recipe/${daily.id}`)}
                  >
                    {t('home.seeRecipe')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ===== BODY SHEET ============================================== */}
      <div className="home-sheet">
        {/* create recipe CTA */}
        <button type="button" className="home-create" onClick={() => navigate('/create')}>
          <span className="home-create__plus">+</span>
          {t('home.createRecipe')}
        </button>

        {/* filter chips */}
        <div className="home-filters" role="tablist" aria-label={t('home.feedTitle')}>
          {FILTERS.map((f, i) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={i === activeFilter}
              className={`home-chip ${i === activeFilter ? 'is-active' : ''}`}
              onClick={() => pickFilter(i)}
            >
              {t(`home.filters.${f.key}`)}
            </button>
          ))}
        </div>

        {/* ===== FEED ================================================= */}
        <section className="home-section">
          <div className="home-section__head">
            <h2 className="home-section__title">{t('home.feedTitle')}</h2>
            <p className="home-section__sub">{t('home.feedSub')}</p>
          </div>

          {feed === null ? (
            <div className="home-feed">
              {Array.from({ length: 4 }).map((_, i) => (
                <article className="home-card" key={i}>
                  <div className="home-card__photo" aria-hidden="true" />
                  <div className="home-card__body">
                    <Skeleton className="skl--title" style={{ width: '80%' }} />
                    <Skeleton className="skl--line" style={{ width: '60%' }} />
                  </div>
                </article>
              ))}
            </div>
          ) : feed.length === 0 ? (
            <p className="home-empty">{t('home.feedEmpty')}</p>
          ) : (
            <div className="home-feed">
              {feed.map((r) => (
                <RecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          )}
        </section>

        {/* ===== PANELS: passport + reviews ========================== */}
        <section className="home-panels">
          {/* culinary passport */}
          <button type="button" className="home-passport" onClick={() => setShowGlobe(true)}>
            <h2 className="home-passport__title">{t('home.passportTitle')}</h2>
            <p className="home-passport__sub">{t('home.passportSub')}</p>
            <div className="home-passport__stamps">
              {passport.length === 0 ? (
                <span className="home-passport__empty">🌍</span>
              ) : (
                passport.slice(0, 6).map((c) => (
                  <span className="home-passport__flag" key={c.country} title={countryOf(c.country).name}>
                    {countryOf(c.country).flag}
                  </span>
                ))
              )}
            </div>
            <span className="home-passport__cta">{t('home.passportOpen')} →</span>
          </button>

          {/* fresh reviews */}
          <article className="home-reviews">
            <h2 className="home-reviews__title">{t('home.reviewsTitle')}</h2>

            {reviews.length === 0 ? (
              <p className="home-empty">{t('home.reviewsEmpty')}</p>
            ) : (
              <ul className="home-reviews__list">
                {reviews.slice(0, 3).map((rv) => (
                  <li className="home-review" key={rv.id}>
                    <div className="home-review__head">
                      <span className="home-review__who">{rv.user?.full_name || rv.user?.username}</span>
                      <Stars value={rv.rating} size={14} />
                    </div>
                    {rv.comment && <p className="home-review__text">{rv.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </div>

      <PassportGlobe open={showGlobe} onClose={() => setShowGlobe(false)} countries={passport} />
    </div>
  );
}

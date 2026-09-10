import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listRecipes, getDailyDish } from '../../services/recipes';
import { recentReviews } from '../../services/reviews';
import { getPassport } from '../../services/users';
import { useUser } from '../../user';
import { countryOf } from '../../data/countries';
import { RANK_COLORS } from '../../lib/ranks';
import RecipeCard from '../../components/RecipeCard';
import PassportGlobe from '../../components/PassportGlobe';
import Stars from '../../components/Stars';
import './Home.css';

function Skeleton({ className = '', style }) {
  return <span className={`skl ${className}`} style={style} aria-hidden="true" />;
}

/* The chips are five different questions, not five sorts of one list.
   `filter` is what the backend is asked for; recommended, fridge and
   allergy_free are resolved server-side in services/feed.py, because they need
   the deserialised ingredients, the allergen list, or the follow graph. */
const FILTERS = [
  { key: 'recommended', filter: 'recommended' },
  { key: 'under30', filter: 'under30' },
  { key: 'fridge', filter: 'fridge' },
  { key: 'allergyFree', filter: 'allergy_free' },
  { key: 'topRated', filter: 'top_rated' },
];

/* Remembered between visits: retyping the contents of your fridge every time
   would make the filter not worth using. */
const PANTRY_KEY = 'kooka_pantry';

function readPantry() {
  try {
    return localStorage.getItem(PANTRY_KEY) || '';
  } catch {
    return '';
  }
}

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user] = useUser();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(0);

  // the fridge filter: the draft in the box vs. the list actually searched
  const [pantryDraft, setPantryDraft] = useState(readPantry);
  const [pantry, setPantry] = useState(readPantry);

  const [daily, setDaily] = useState(undefined); // undefined = loading, null = none
  const [feed, setFeed] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [passport, setPassport] = useState([]);
  const [showGlobe, setShowGlobe] = useState(false);

  const current = FILTERS[activeFilter];
  const isFridge = current.key === 'fridge';
  const isAllergyFree = current.key === 'allergyFree';
  const hasAllergies = (user?.allergies || []).length > 0;

  // daily dish (once)
  useEffect(() => {
    getDailyDish().then(setDaily).catch(() => setDaily(null));
  }, []);

  /* The fridge chip is the one that cannot answer on its own: with an empty
     pantry there is nothing to match against. That is a render-time fact, not
     a fetch result, so it short-circuits below rather than being written into
     `feed` from inside the effect. */
  const needsPantry = isFridge && !pantry.trim();

  useEffect(() => {
    if (needsPantry) return undefined;
    let alive = true;
    listRecipes({ filter: current.filter, pantry: isFridge ? pantry : '', limit: 12 })
      .then((r) => alive && setFeed(r))
      .catch(() => alive && setFeed([]));
    return () => {
      alive = false;
    };
  }, [current.filter, isFridge, pantry, needsPantry]);

  const pickFilter = (i) => {
    setActiveFilter(i);
    setFeed(null); // show skeletons while the new filter loads
  };

  const searchPantry = (e) => {
    e.preventDefault();
    const clean = pantryDraft.trim();
    try {
      localStorage.setItem(PANTRY_KEY, clean);
    } catch { /* storage may be unavailable — the search still runs */ }
    setFeed(null);
    setPantry(clean);
  };

  const clearPantry = () => {
    setPantryDraft('');
    setPantry('');
    try {
      localStorage.removeItem(PANTRY_KEY);
    } catch { /* nothing to clean up */ }
  };

  // fresh reviews across all recipes (each carries its recipe)
  useEffect(() => {
    let alive = true;
    recentReviews(6)
      .then((r) => alive && setReviews(r))
      .catch(() => alive && setReviews([]));
    return () => {
      alive = false;
    };
  }, []);

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
  // the daily dish is featured in the hero, so keep it out of the feed grid
  const feedItems = needsPantry
    ? []
    : feed ? feed.filter((r) => r.id !== daily?.id) : feed;

  /* The rank replaces the old "Lvl 3" pill: a level was a number nobody could
     place, while a rank has a name and a colour that also show up on recipes,
     badges and the ladder in Learn. RANK_COLORS mirrors services/ranks.py. */
  const rank = user?.rank;
  const rankColors = RANK_COLORS[rank?.rank] || RANK_COLORS.copper;
  const rankStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${rankColors.vibrant}, ${rankColors.shadow})`,
    }),
    [rankColors],
  );

  const emptyMessage = () => {
    if (isFridge) return pantry.trim() ? t('home.fridge.empty') : t('home.fridge.prompt');
    if (isAllergyFree && !hasAllergies) return t('home.allergyEmpty');
    if (current.key === 'recommended') return t('home.recommendedEmpty');
    return t('home.feedEmpty');
  };

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
              <button
                type="button"
                className="home-rank"
                style={rankStyle}
                onClick={() => navigate('/learn')}
                title={
                  rank && !rank.is_max
                    ? t('recipe.xpToGo', { xp: rank.xp_to_next?.toLocaleString() })
                    : undefined
                }
              >
                {rank?.tier_label || 'Copper I'}
              </button>
              <button
                type="button"
                className="home-create-plus"
                onClick={() => navigate('/create')}
                aria-label={t('home.createRecipe')}
                title={t('home.createRecipe')}
              >
                +
              </button>
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

        {/* the fridge chip needs an answer from you before it can answer back */}
        {isFridge && (
          <form className="home-pantry" onSubmit={searchPantry}>
            <label className="home-pantry__label" htmlFor="home-pantry-input">
              {t('home.fridge.label')}
            </label>
            <div className="home-pantry__row">
              <input
                id="home-pantry-input"
                type="text"
                value={pantryDraft}
                onChange={(e) => setPantryDraft(e.target.value)}
                placeholder={t('home.fridge.placeholder')}
              />
              <button type="submit" className="home-btn home-btn--primary">
                {t('home.fridge.search')}
              </button>
              {pantry && (
                <button type="button" className="home-pantry__clear" onClick={clearPantry}>
                  {t('home.fridge.clear')}
                </button>
              )}
            </div>
            <p className="home-pantry__hint">{t('home.fridge.hint')}</p>
          </form>
        )}

        {/* nothing to filter by yet — offer the fix rather than an empty grid */}
        {isAllergyFree && !hasAllergies && (
          <div className="home-nudge">
            <p>{t('home.allergyEmpty')}</p>
            <button type="button" className="home-btn home-btn--primary" onClick={() => navigate('/settings?section=allergies')}>
              {t('home.allergySet')}
            </button>
          </div>
        )}

        {/* ===== FEED ================================================= */}
        <section className="home-section">
          <div className="home-section__head">
            <h2 className="home-section__title">{t('home.feedTitle')}</h2>
            <p className="home-section__sub">{t(`home.subs.${current.key}`)}</p>
          </div>

          {feedItems === null ? (
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
          ) : feedItems.length === 0 ? (
            <p className="home-empty">{emptyMessage()}</p>
          ) : (
            <div className="home-feed">
              {feedItems.map((r) => (
                <div className="home-feed__item" key={r.id}>
                  <RecipeCard recipe={r} />
                  {/* Why this card is here — only when the card itself does
                      not already say it. */}
                  {isFridge && r.match_percent != null && (
                    <p className="home-match">
                      <b>{t('home.fridge.match', { percent: r.match_percent })}</b>
                      {r.missing?.length > 0 && (
                        <span>
                          {t('home.fridge.missing', { list: r.missing.slice(0, 3).join(', ') })}
                          {r.need_count - r.have_count > r.missing.length
                            ? ` ${t('home.fridge.missingMore')}`
                            : ''}
                        </span>
                      )}
                    </p>
                  )}
                  {r.allergen_conflicts?.length > 0 && (
                    <p className="home-warn">
                      ⚠️ {t('home.allergyWarn', { list: r.allergen_conflicts.join(', ') })}
                    </p>
                  )}
                </div>
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
                      {/* the name is the way to the person who wrote it */}
                      {rv.user?.id ? (
                        <Link className="home-review__who" to={`/profile/${rv.user.id}`}>
                          {rv.user.full_name || rv.user.username}
                        </Link>
                      ) : (
                        <span className="home-review__who">—</span>
                      )}
                      <Stars value={rv.rating} size={14} />
                    </div>
                    {rv.recipe && (
                      <Link className="home-review__recipe" to={`/recipe/${rv.recipe.id}`}>
                        {rv.recipe.origin ? `${countryOf(rv.recipe.origin).flag} ` : ''}
                        {rv.recipe.title}
                      </Link>
                    )}
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

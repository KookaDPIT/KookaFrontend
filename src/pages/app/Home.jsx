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

/* Four different questions, not four sorts of one list. `filter` is what the
   backend is asked for; recommended and allergy_free are resolved server-side
   in services/feed.py, because they need the deserialised allergen list or the
   follow graph.

   "What's in my fridge" used to live here too. It was the one chip that could
   not answer on its own — it made you fill in a form before the feed would say
   anything — so the whole idea moved to AI Chat, where describing what you
   have is the natural thing to do anyway. */
const FILTERS = [
  { key: 'recommended', filter: 'recommended' },
  { key: 'under30', filter: 'under30' },
  { key: 'allergyFree', filter: 'allergy_free' },
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
  /* True when what is on screen is the random shelf rather than the answer to
     the chip you pressed — the feed says so instead of pretending. */
  const [feedIsFallback, setFeedIsFallback] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [passport, setPassport] = useState([]);
  const [showGlobe, setShowGlobe] = useState(false);

  const current = FILTERS[activeFilter];
  const isAllergyFree = current.key === 'allergyFree';
  const hasAllergies = (user?.allergies || []).length > 0;

  // daily dish (once)
  useEffect(() => {
    getDailyDish().then(setDaily).catch(() => setDaily(null));
  }, []);

  /* A chip that finds nothing falls back to a random shelf rather than an
     empty page. On a young catalogue "recommended for you" legitimately has
     nothing to say, and an empty grid reads as a broken app rather than as an
     honest answer — so we show a few dishes and label them as such. */
  useEffect(() => {
    let alive = true;
    listRecipes({ filter: current.filter, limit: 12 })
      .then((rows) => {
        if (!alive) return;
        if (rows.length > 0) {
          setFeed(rows);
          setFeedIsFallback(false);
          return undefined;
        }
        return listRecipes({ filter: 'random', limit: 8 }).then((random) => {
          if (!alive) return;
          setFeed(random);
          setFeedIsFallback(random.length > 0);
        });
      })
      .catch(() => {
        if (!alive) return;
        setFeed([]);
        setFeedIsFallback(false);
      });
    return () => {
      alive = false;
    };
  }, [current.filter]);

  /* These are options, not toggles: pressing the one that is already on used
     to clear the grid to skeletons and re-fetch the same list, which looked
     like the button had broken it. */
  const pickFilter = (i) => {
    if (i === activeFilter) return;
    setActiveFilter(i);
    setFeed(null); // skeletons while the new answer loads
    setFeedIsFallback(false);
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
  const feedItems = feed ? feed.filter((r) => r.id !== daily?.id) : feed;

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

  /* Only reached when even the random shelf came back empty — i.e. the
     catalogue itself is empty. */
  const emptyMessage = () => {
    if (isAllergyFree && !hasAllergies) return t('home.allergyEmpty');
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
            <p className="home-section__sub">
              {feedIsFallback ? t('home.fallbackSub') : t(`home.subs.${current.key}`)}
            </p>
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

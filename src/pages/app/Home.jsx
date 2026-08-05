import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Home.css';

/* Reusable skeleton block — stands in for any data the backend will supply.
   Everything data-driven (daily dish, feed recipes, level/XP, passport, reviews)
   renders as one of these until the API is wired up. */
function Skeleton({ className = '', style }) {
  return <span className={`skl ${className}`} style={style} aria-hidden="true" />;
}

/* Static UI copy — these are part of the design, not backend data. */
const FILTER_KEYS = ['recommended', 'under30', 'fridge', 'allergyFree', 'topRated'];

export default function Home() {
  const { t } = useTranslation();
  // Client-side interactivity only — no backend calls yet, just UI state.
  const [activeFilter, setActiveFilter] = useState(0);
  const [saved, setSaved] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [search, setSearch] = useState('');
  const [review, setReview] = useState('');

  const handleAddReview = () => {
    if (!review.trim()) return;
    // TODO: POST review once the backend is ready. For now just clear the field.
    setReview('');
  };

  return (
    <div className="home">
      {/* ===== HERO — daily global dish ================================= */}
      <header className="home-hero">
        <div className="home-hero__photo" aria-hidden="true" />

        <div className="home-hero__inner">
          {/* top bar: search + level + avatar */}
          <div className="home-topbar">
            <div className="home-brand">
              <span className="home-brand__mark">KOOKA</span>
            </div>

            <form
              className="home-search"
              onSubmit={(e) => e.preventDefault()}
              role="search"
            >
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
              <Skeleton className="skl--pill home-level" />
              <button
                type="button"
                className="home-avatar"
                aria-label={t('home.yourProfile')}
              />
            </div>
          </div>

          {/* daily dish */}
          <div className="home-daily">
            <span className="home-daily__badge">
              {t('home.dailyDish')}
              <span className="home-daily__dot" />
              <Skeleton className="skl--time" />
            </span>

            <div className="home-daily__title">
              <Skeleton className="skl--h1" style={{ width: '58%' }} />
              <Skeleton className="skl--h1" style={{ width: '42%' }} />
            </div>

            <Skeleton className="skl--line home-daily__meta" />

            <div className="home-daily__actions">
              <button
                type="button"
                className={`home-btn home-btn--primary ${cooking ? 'is-cooking' : ''}`}
                aria-pressed={cooking}
                onClick={() => setCooking((v) => !v)}
              >
                {cooking ? t('home.cooking') : t('home.startCooking')}
              </button>
              <button
                type="button"
                className={`home-btn home-btn--ghost ${saved ? 'is-saved' : ''}`}
                aria-pressed={saved}
                onClick={() => setSaved((v) => !v)}
              >
                {saved ? t('home.saved') : t('home.save')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ===== BODY SHEET ============================================== */}
      <div className="home-sheet">
        {/* filter chips */}
        <div className="home-filters" role="tablist" aria-label={t('home.feedTitle')}>
          {FILTER_KEYS.map((key, i) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={i === activeFilter}
              className={`home-chip ${i === activeFilter ? 'is-active' : ''}`}
              onClick={() => setActiveFilter(i)}
            >
              {t(`home.filters.${key}`)}
            </button>
          ))}
        </div>

        {/* ===== FEED ================================================= */}
        <section className="home-section">
          <div className="home-section__head">
            <h2 className="home-section__title">{t('home.feedTitle')}</h2>
            <p className="home-section__sub">{t('home.feedSub')}</p>
          </div>

          <div className="home-feed">
            {Array.from({ length: 4 }).map((_, i) => (
              <article className="home-card" key={i}>
                <div className="home-card__photo" aria-hidden="true" />
                <div className="home-card__body">
                  <Skeleton className="skl--tag" style={{ width: '38%' }} />
                  <Skeleton className="skl--title" style={{ width: '80%' }} />
                  <Skeleton className="skl--line" style={{ width: '60%' }} />
                  <div className="home-card__foot">
                    <Skeleton className="skl--line" style={{ width: '34%' }} />
                    <Skeleton className="skl--xp" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ===== PANELS: passport + reviews ========================== */}
        <section className="home-panels">
          {/* culinary passport */}
          <article className="home-passport">
            <h2 className="home-passport__title">{t('home.passportTitle')}</h2>
            <p className="home-passport__sub">{t('home.passportSub')}</p>
            <div className="home-passport__map" aria-hidden="true" />
            <div className="home-passport__stamps">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton className="skl--stamp" key={i} />
              ))}
            </div>
          </article>

          {/* fresh reviews */}
          <article className="home-reviews">
            <h2 className="home-reviews__title">{t('home.reviewsTitle')}</h2>

            <div className="home-reviews__avatars">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton className="skl--avatar" key={i} />
              ))}
              <Skeleton className="skl--avatar skl--avatar-count" />
            </div>

            <div className="home-reviews__quote">
              <Skeleton className="skl--line" style={{ width: '100%' }} />
              <Skeleton className="skl--line" style={{ width: '86%' }} />
              <Skeleton className="skl--line" style={{ width: '40%' }} />
            </div>

            <form
              className="home-reviews__add"
              onSubmit={(e) => {
                e.preventDefault();
                handleAddReview();
              }}
            >
              <input
                type="text"
                placeholder={t('home.reviewPh')}
                aria-label={t('home.reviewAria')}
                value={review}
                onChange={(e) => setReview(e.target.value)}
              />
              <button
                type="submit"
                className="home-btn home-btn--primary"
                disabled={!review.trim()}
              >
                {t('home.add')}
              </button>
            </form>
          </article>
        </section>
      </div>
    </div>
  );
}

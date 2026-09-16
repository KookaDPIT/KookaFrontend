import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { search as searchApi } from '../../services/search';
import { follow, unfollow } from '../../services/users';
import { COURSES, KCAL_BANDS, KCAL_BAND_BY_ID, courseEmoji } from '../../lib/courses';
import RecipeCard from '../../components/RecipeCard';
import './Search.css';

function UserRow({ user }) {
  const { t } = useTranslation();
  const [isFollowing, setIsFollowing] = useState(user.is_following);
  const [busy, setBusy] = useState(false);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      if (isFollowing) {
        await unfollow(user.id);
        setIsFollowing(false);
      } else {
        await follow(user.id);
        setIsFollowing(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Link to={`/profile/${user.id}`} className="sresult-user">
      <div
        className="sresult-user__avatar"
        style={user.avatar_url ? { backgroundImage: `url(${user.avatar_url})` } : undefined}
      >
        {!user.avatar_url && (user.full_name || user.username || '?')[0].toUpperCase()}
      </div>
      <div className="sresult-user__info">
        <span className="sresult-user__name">{user.full_name || user.username}</span>
        <span className="sresult-user__handle">@{user.username} · {t('search.recipeCount', { count: user.recipe_count })}</span>
      </div>
      {!user.is_self && (
        <button
          type="button"
          className={`sresult-user__follow ${isFollowing ? 'is-following' : ''}`}
          onClick={toggle}
          disabled={busy}
        >
          {isFollowing ? t('search.following') : t('search.follow')}
        </button>
      )}
    </Link>
  );
}

export default function Search() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  /* The filters live in the URL next to the query, so a filtered search can be
     shared, bookmarked and survives the back button — the same reason `q` is
     there. `course` is a comma-separated list because the chips are
     checkboxes: "dessert or snack" is a reasonable thing to ask. */
  const courseParam = params.get('course') || '';
  const band = params.get('kcal') || '';
  const picked = courseParam ? courseParam.split(',').filter(Boolean) : [];

  const [term, setTerm] = useState(q);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  /* Writes one key without disturbing the others, and drops empty values so
     the URL never grows `?q=&course=&kcal=`. */
  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const toggleCourse = (id) => {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    setParam('course', next.join(','));
  };

  const clearFilters = () => {
    const next = new URLSearchParams(params);
    next.delete('course');
    next.delete('kcal');
    setParams(next);
  };

  const hasFilters = picked.length > 0 || Boolean(band);

  // Re-run the search whenever the URL query changes. All setState calls live
  // after an `await`, i.e. in an async continuation — never synchronously in the
  // effect body (react-hooks/set-state-in-effect). `term` is seeded from `q` on
  // mount and is user-driven thereafter.
  useEffect(() => {
    let alive = true;
    const query = q.trim();
    const courses = courseParam ? courseParam.split(',').filter(Boolean) : [];
    const range = KCAL_BAND_BY_ID[band];
    const filtered = courses.length > 0 || Boolean(range);
    const search = async () => {
      await Promise.resolve(); // defer past the synchronous effect body
      if (!alive) return;
      // Filters alone are a search: "every dessert under 400 kcal" has no
      // words in it. Only a completely untouched page shows the prompt.
      if (!query && !filtered) {
        setResults(null);
        return;
      }
      setLoading(true);
      try {
        const data = await searchApi(query, {
          course: courses,
          kcalMin: range?.min || 0,
          kcalMax: range?.max || 0,
        });
        if (alive) setResults(data);
      } catch {
        if (alive) setResults({ recipes: [], users: [] });
      } finally {
        if (alive) setLoading(false);
      }
    };
    search();
    return () => {
      alive = false;
    };
  }, [q, courseParam, band]);

  const onSubmit = (e) => {
    e.preventDefault();
    setParam('q', term.trim());
  };

  const empty =
    results && results.recipes.length === 0 && results.users.length === 0;

  return (
    <div className="search-page">
      <div className="search-page__inner">
        <h1 className="search-page__title">{t('search.title')}</h1>

        <form className="search-page__bar" onSubmit={onSubmit} role="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
          <input
            type="search"
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t('search.placeholder')}
          />
        </form>

        {/* ---- what kind of dish, and how heavy -------------------------
            Two separate questions, so two separate rows: the courses are
            checkboxes (you may want a dessert OR a snack), the calorie band is
            a single choice (a range cannot be two ranges). */}
        <div className="sfilters">
          <div className="sfilters__row">
            <span className="sfilters__label">{t('search.courseLabel')}</span>
            <div className="sfilters__chips">
              {COURSES.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`sfilters__chip ${picked.includes(c.id) ? 'is-on' : ''}`}
                  aria-pressed={picked.includes(c.id)}
                  onClick={() => toggleCourse(c.id)}
                >
                  <span aria-hidden="true">{courseEmoji(c.id)}</span>
                  {t(`courses.${c.id}`, c.name)}
                </button>
              ))}
            </div>
          </div>

          <div className="sfilters__row">
            <span className="sfilters__label">{t('search.kcalLabel')}</span>
            <div className="sfilters__chips">
              {KCAL_BANDS.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  className={`sfilters__chip ${band === b.id ? 'is-on' : ''}`}
                  aria-pressed={band === b.id}
                  onClick={() => setParam('kcal', band === b.id ? '' : b.id)}
                >
                  {t(`search.kcalBands.${b.id}`)}
                </button>
              ))}
              {hasFilters && (
                <button type="button" className="sfilters__clear" onClick={clearFilters}>
                  {t('search.clearFilters')}
                </button>
              )}
            </div>
          </div>
        </div>

        {!results && !loading && <p className="search-page__hint">{t('search.typePrompt')}</p>}
        {loading && <p className="search-page__hint">{t('common.loading')}…</p>}
        {empty && (
          <p className="search-page__hint">
            {q ? t('search.noResults', { q }) : t('search.noFilterResults')}
          </p>
        )}

        {results?.users?.length > 0 && (
          <section className="search-page__section">
            <h2 className="search-page__h2">{t('search.people')}</h2>
            <div className="search-page__users">
              {results.users.map((u) => (
                <UserRow key={u.id} user={u} />
              ))}
            </div>
          </section>
        )}

        {results?.recipes?.length > 0 && (
          <section className="search-page__section">
            <h2 className="search-page__h2">{t('search.recipes')}</h2>
            <div className="search-page__recipes">
              {results.recipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

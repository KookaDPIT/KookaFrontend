import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { search as searchApi } from '../../services/search';
import { follow, unfollow } from '../../services/users';
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

  const [term, setTerm] = useState(q);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // Re-run the search whenever the URL query changes. All setState calls live
  // after an `await`, i.e. in an async continuation — never synchronously in the
  // effect body (react-hooks/set-state-in-effect). `term` is seeded from `q` on
  // mount and is user-driven thereafter.
  useEffect(() => {
    let alive = true;
    const query = q.trim();
    const search = async () => {
      await Promise.resolve(); // defer past the synchronous effect body
      if (!alive) return;
      if (!query) {
        setResults(null);
        return;
      }
      setLoading(true);
      try {
        const data = await searchApi(query);
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
  }, [q]);

  const onSubmit = (e) => {
    e.preventDefault();
    setParams(term.trim() ? { q: term.trim() } : {});
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

        {!results && !loading && <p className="search-page__hint">{t('search.typePrompt')}</p>}
        {loading && <p className="search-page__hint">{t('common.loading')}…</p>}
        {empty && <p className="search-page__hint">{t('search.noResults', { q })}</p>}

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

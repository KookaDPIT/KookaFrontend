import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getForumMeta, listPosts, votePost } from '../../services/forum';
import { languageName } from '../../lib/languages';
import LanguagePicker from '../../components/LanguagePicker';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import './Forum.css';

/* ==========================================================================
   FORUM — a homescreen of posts.

   Everything is one board, split into subforums by the LANGUAGE you write in;
   the subject is carried by a TAG, so the same topic stays findable in every
   language. Posts render as an aligned mosaic of rounded tiles — same grid,
   same gutters, no masonry — with the top-ranked post taking a 2x2 "widget"
   slot the way a homescreen gives one app more room.

   Search accepts either a post ID (`#42` or `42`) or words from the title.
   ========================================================================== */

const SORTS = ['hot', 'new', 'top', 'rising'];

/* Tile look per tag. Warm and earthy on purpose — eight saturated hues would
   read as a colour test, not a board. */
const TAG_EMOJI = {
  question: '❓', recipe: '📖', tip: '💡', help: '🆘',
  win: '🏆', showcase: '✨', gear: '🔪', offtopic: '💬',
};

function timeAgo(iso, t) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return t('forum.now');
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

function compact(n) {
  return n > 999 ? `${(n / 1000).toFixed(1)}k` : String(n ?? 0);
}

/* One homescreen tile. `lead` gets the 2x2 slot and shows an excerpt. */
function Tile({ post, lead, onOpen, onVote, t }) {
  return (
    <article className={`fo-tile fo-tile--${post.tag} ${lead ? 'is-lead' : ''}`}>
      <button
        type="button"
        className="fo-tile__open"
        onClick={() => onOpen(post.id)}
        aria-label={post.title}
      >
        <span className="fo-tile__top">
          <span className="fo-tile__tag">
            <i aria-hidden="true">{TAG_EMOJI[post.tag] || '💬'}</i>
            {t(`forum.tags.${post.tag}`)}
          </span>
          <span className="fo-tile__id">#{post.id}</span>
        </span>

        <span className="fo-tile__body">
          <h3 className="fo-tile__title">{post.title}</h3>
          {lead && post.excerpt && <p className="fo-tile__excerpt">{post.excerpt}</p>}
        </span>

        <span className="fo-tile__foot">
          <span className="fo-tile__who">
            @{post.author?.username || '—'} · {timeAgo(post.created_at, t)}
          </span>
          <span className="fo-tile__stat" title={t('forum.commentsLabel')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
            </svg>
            {post.comment_count}
          </span>
        </span>
      </button>

      {/* the vote pill floats over the tile so the whole face stays clickable */}
      <div className="fo-tile__vote">
        <button
          type="button"
          className={`fo-tile__arrow ${post.my_vote === 1 ? 'is-on' : ''}`}
          aria-label={t('forum.upvote')}
          aria-pressed={post.my_vote === 1}
          onClick={() => onVote(post.id, 1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l7 8h-4v6h-6v-6H5z" /></svg>
        </button>
        <b>{compact(post.votes)}</b>
        <button
          type="button"
          className={`fo-tile__arrow ${post.my_vote === -1 ? 'is-down' : ''}`}
          aria-label={t('forum.downvote')}
          aria-pressed={post.my_vote === -1}
          onClick={() => onVote(post.id, -1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19l-7-8h4V5h6v6h4z" /></svg>
        </button>
      </div>
    </article>
  );
}

export default function Forum() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  /* Filters live in the URL so a subforum or a search is a shareable link and
     the back button steps through them. */
  const [params, setParams] = useSearchParams();
  const language = params.get('lang') || '';
  const tag = params.get('tag') || '';
  const sort = params.get('sort') || 'hot';
  const query = params.get('q') || '';

  const [search, setSearch] = useState(query);
  const [lastQuery, setLastQuery] = useState(query);
  const [meta, setMeta] = useState({
    languages: [], all_languages: [], tags: [], trending: [], total: 0,
  });
  const [langPicker, setLangPicker] = useState(false);
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const flash = useCallback((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  }, []);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    let alive = true;
    getForumMeta()
      .then((m) => { if (alive) setMeta(m); })
      .catch(() => { /* the filters just render empty counts */ });
    return () => { alive = false; };
  }, []);

  /* The box holds its own text while you type, but the URL is the source of
     truth — when it changes from outside (back button, a trending chip) the box
     has to follow. Adjusting during render is React's own pattern for that; an
     effect would render once with the stale text first. */
  if (query !== lastQuery) {
    setLastQuery(query);
    setSearch(query);
  }

  useEffect(() => {
    let alive = true;
    listPosts({ q: query, language, tag, sort })
      .then((data) => {
        if (!alive) return;
        setPosts(data.posts || []);
        setTotal(data.total || 0);
        setError('');
        setLoaded(true);
      })
      .catch((err) => {
        if (!alive) return;
        const detail = err?.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : t('common.error'));
        setLoaded(true);
      });
    return () => { alive = false; };
  }, [query, language, tag, sort, t]);

  const submitSearch = (e) => {
    e.preventDefault();
    setParam('q', search.trim());
  };

  const vote = async (id, value) => {
    const before = posts.find((p) => p.id === id);
    if (!before) return;
    // optimistic: the tile reacts on the press, then the server's count wins
    const delta = before.my_vote === value ? -value : value - before.my_vote;
    setPosts((list) => list.map((p) => (p.id === id
      ? { ...p, votes: p.votes + delta, my_vote: p.my_vote === value ? 0 : value }
      : p)));
    try {
      const res = await votePost(id, value);
      setPosts((list) => list.map((p) => (p.id === id
        ? { ...p, votes: res.votes, my_vote: res.my_vote }
        : p)));
    } catch (err) {
      setPosts((list) => list.map((p) => (p.id === id ? before : p)));
      const detail = err?.response?.data?.detail;
      flash(typeof detail === 'string' ? detail : t('common.error'));
    }
  };

  /* The selected subforum must stay visible even if it has no posts (you can
     land on an empty one from a link), so pin it into the row. */
  const subforums = (() => {
    const list = meta.languages;
    if (!language || list.some((l) => l.code === language)) return list;
    const known = meta.all_languages.find((l) => l.code === language);
    return [{ code: language, label: known?.label || language, posts: 0 }, ...list];
  })();

  const searching = !!query;
  const idLookup = searching && /^#?\d+$/.test(query.trim());

  return (
    <div className="fo">
      {/* ===== HEADER ===== */}
      <header className="fo-head">
        <div className="fo-head__text">
          <h1 className="fo-head__title">{t('forum.title')}</h1>
          <p className="fo-head__sub">{t('forum.subtitle')}</p>
        </div>

        <form className="fo-search" onSubmit={submitSearch} role="search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('forum.searchPh')}
            aria-label={t('forum.searchPh')}
          />
          {query && (
            <button
              type="button"
              className="fo-search__clear"
              onClick={() => { setSearch(''); setParam('q', ''); }}
              aria-label={t('forum.clearSearch')}
            >
              ×
            </button>
          )}
        </form>

        <button
          type="button"
          className="fo-plus"
          onClick={() => navigate('/forum/new')}
          aria-label={t('forum.newPost')}
          title={t('forum.newPost')}
        >
          +
        </button>
      </header>

      {/* ===== SUBFORUMS (languages) ===== */}
      <nav className="fo-langs" aria-label={t('forum.subforums')}>
        <button
          type="button"
          className={`fo-lang ${!language ? 'is-active' : ''}`}
          onClick={() => setParam('lang', '')}
        >
          <span className="fo-lang__flag" aria-hidden="true">🌍</span>
          <span className="fo-lang__text">
            <b>{t('forum.allLanguages')}</b>
            <small>{t('forum.postCount', { count: meta.total })}</small>
          </span>
        </button>

        {/* Only subforums that actually exist get a tile. Every other language
            is one search away in the picker — with 183 of them, a full row is
            not an option. */}
        {subforums.map((l) => (
          <button
            key={l.code}
            type="button"
            className={`fo-lang ${language === l.code ? 'is-active' : ''}`}
            onClick={() => setParam('lang', l.code)}
          >
            {/* the two-letter code, not the flag emoji: Windows renders
                regional-indicator pairs as bare letters, so a flag would look
                different on every platform */}
            <span className="fo-lang__flag" aria-hidden="true">{l.code.toUpperCase()}</span>
            <span className="fo-lang__text">
              <b>{languageName(l.code, i18n.language, l.label)}</b>
              <small>{t('forum.postCount', { count: l.posts })}</small>
            </span>
          </button>
        ))}

        <button
          type="button"
          className="fo-lang fo-lang--more"
          onClick={() => setLangPicker(true)}
        >
          <span className="fo-lang__flag" aria-hidden="true">···</span>
          <span className="fo-lang__text">
            <b>{t('forum.otherLanguages')}</b>
            <small>{t('forum.languageCount', { count: meta.all_languages.length })}</small>
          </span>
        </button>
      </nav>

      {/* ===== TAGS + SORT ===== */}
      <div className="fo-controls">
        <div className="fo-tags" role="group" aria-label={t('forum.filterByTag')}>
          <button
            type="button"
            className={`fo-tagchip ${!tag ? 'is-active' : ''}`}
            onClick={() => setParam('tag', '')}
          >
            {t('forum.allTags')}
          </button>
          {meta.tags.map((x) => (
            <button
              key={x.code}
              type="button"
              className={`fo-tagchip fo-tagchip--${x.code} ${tag === x.code ? 'is-active' : ''}`}
              onClick={() => setParam('tag', tag === x.code ? '' : x.code)}
            >
              <i aria-hidden="true">{x.emoji}</i>
              {t(`forum.tags.${x.code}`)}
              <em>{x.posts}</em>
            </button>
          ))}
        </div>

        <div className="fo-sort" role="tablist" aria-label={t('forum.sortLabel')}>
          {SORTS.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={sort === s}
              className={`fo-sort__btn ${sort === s ? 'is-active' : ''}`}
              onClick={() => setParam('sort', s)}
            >
              {t(`forum.sort.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ===== TRENDING ===== */}
      {meta.trending.length > 0 && !searching && (
        <div className="fo-trend">
          <span className="fo-trend__label">{t('forum.trendingTitle')}</span>
          {meta.trending.map((x, i) => (
            <button
              key={x.tag}
              type="button"
              className="fo-trend__chip"
              onClick={() => setParam('tag', x.tag)}
            >
              <span className="fo-trend__rank">{i + 1}</span>
              <i aria-hidden="true">{TAG_EMOJI[x.tag] || '💬'}</i>
              {t(`forum.tags.${x.tag}`)}
              <em>{x.posts}</em>
            </button>
          ))}
        </div>
      )}

      {/* ===== RESULT NOTE ===== */}
      {searching && (
        <p className="fo-note">
          {idLookup ? t('forum.searchById', { id: query.replace('#', '') })
            : t('forum.searchResults', { count: total, q: query })}
        </p>
      )}

      {/* ===== MOSAIC ===== */}
      {error && <p className="fo-empty">{error}</p>}

      {!error && loaded && posts.length === 0 && (
        <div className="fo-empty">
          <p className="fo-empty__title">{t('forum.emptyTitle')}</p>
          <p>{searching ? t('forum.emptySearch') : t('forum.emptySort')}</p>
          <button type="button" className="fo-empty__cta" onClick={() => navigate('/forum/new')}>
            {t('forum.newPost')}
          </button>
        </div>
      )}

      {posts.length > 0 && (
        <div className="fo-mosaic">
          {posts.map((p, i) => (
            <Tile
              key={p.id}
              post={p}
              /* the top-ranked post earns the widget slot, but only when the
                 order actually means something — not mid-search */
              lead={i === 0 && !searching}
              onOpen={(id) => navigate(`/forum/${id}`)}
              onVote={vote}
              t={t}
            />
          ))}
        </div>
      )}

      <Modal
        open={langPicker}
        onClose={() => setLangPicker(false)}
        title={t('forum.pickLanguage')}
      >
        <LanguagePicker
          all={meta.all_languages}
          active={meta.languages}
          value={language}
          autoFocus
          onPick={(code) => {
            setParam('lang', code === language ? '' : code);
            setLangPicker(false);
          }}
        />
      </Modal>

      <Toast message={toast} />
    </div>
  );
}

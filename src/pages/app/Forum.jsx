import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KookaAvatar } from '../../components/Icons';
import Toast from '../../components/Toast';
import './Forum.css';

/* ==========================================================================
   FORUM — "The Table": a Reddit-shaped discussion board for the kitchen.
   Fully interactive on the client: vote (re-sorts the feed), sort, save,
   join a kitchen, and start a thread from the composer. Everything is local
   state — a backend can later replace the seed data and the mutators.
   ========================================================================== */

const SORTS = ['hot', 'new', 'top', 'rising'];

/* seed feed — `lead` marks the post that gets the larger treatment */
const SEED = [
  {
    id: 1,
    community: 'k/CarbonaraLaw',
    author: 'guanciale_gary',
    time: '3h',
    title: 'My guanciale rendered into pure liquid gold — am I allowed to gatekeep now?',
    body:
      'Rendered low and slow in a cold pan until glassy. No oil, no garlic, no cream. The emulsion held on the first try. I have never felt more Roman.',
    tag: 'Win',
    votes: 428,
    comments: 96,
    lead: true,
  },
  {
    id: 2,
    community: 'k/Fermentation',
    author: 'brine_witch',
    time: '5h',
    title: 'Day 6 of my hot sauce ferment — kahm yeast or should I panic?',
    photo: 'a jar of red mash with a thin white film on top',
    tag: 'Help',
    votes: 213,
    comments: 74,
  },
  {
    id: 3,
    community: 'k/WeeknightWins',
    author: 'thirty_min_tina',
    time: '8h',
    title: 'One pan, 25 minutes: chicken, rice and peppers. Full recipe in the comments.',
    tag: 'Recipe',
    votes: 187,
    comments: 41,
  },
  {
    id: 4,
    community: 'k/KnifeSkills',
    author: 'ten_fingers_still',
    time: '11h',
    title: 'Finally drilled the claw grip and stopped donating fingertips to the cutting board.',
    tag: 'Milestone',
    votes: 156,
    comments: 28,
  },
  {
    id: 5,
    community: 'k/SourdoughSOS',
    author: 'dense_crumb_dan',
    time: '14h',
    title: 'Why is my crumb still a brick? Starter passes the float test every time.',
    tag: 'Help',
    votes: 92,
    comments: 63,
  },
];

const COMMUNITIES = [
  { name: 'k/WeeknightWins', members: '128k', joined: true },
  { name: 'k/Fermentation', members: '54k', joined: true },
  { name: 'k/CastIronCult', members: '89k', joined: false },
  { name: 'k/SourdoughSOS', members: '41k', joined: false },
];

const TRENDING = [
  { tag: 'brown butter everything', posts: '1.2k' },
  { tag: 'no-knead panic', posts: '860' },
  { tag: 'the great salt debate', posts: '640' },
  { tag: 'air fryer confessions', posts: '512' },
];

let seq = 100;
const nextId = () => ++seq;

function VoteGutter({ score, myVote, onVote, t }) {
  return (
    <div className="fo-vote">
      <button
        type="button"
        className={`fo-vote__btn ${myVote === 1 ? 'is-up' : ''}`}
        aria-label={t('forum.upvote')}
        aria-pressed={myVote === 1}
        onClick={() => onVote(1)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l7 8h-4v6h-6v-6H5z" /></svg>
      </button>
      <span className={`fo-vote__score ${myVote === 1 ? 'is-up' : myVote === -1 ? 'is-down' : ''}`}>
        {score > 999 ? `${(score / 1000).toFixed(1)}k` : score}
      </span>
      <button
        type="button"
        className={`fo-vote__btn ${myVote === -1 ? 'is-down' : ''}`}
        aria-label={t('forum.downvote')}
        aria-pressed={myVote === -1}
        onClick={() => onVote(-1)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19l-7-8h4V5h6v6h4z" /></svg>
      </button>
    </div>
  );
}

function Post({ post, onVote, onSave, onShare, t }) {
  const score = post.votes + post.myVote;
  return (
    <article className={`fo-post ${post.lead ? 'fo-post--lead' : ''}`}>
      <VoteGutter score={score} myVote={post.myVote} onVote={(d) => onVote(post.id, d)} t={t} />

      <div className="fo-post__main">
        <div className="fo-post__meta">
          <span className="fo-post__community">{post.community}</span>
          <span className="fo-post__dot" />
          <span>{t('forum.postedBy')} {post.author}</span>
          <span className="fo-post__dot" />
          <span>{post.time}</span>
          <span className={`fo-tag fo-tag--${post.tag.toLowerCase()}`}>{post.tag}</span>
        </div>

        <h2 className="fo-post__title">{post.title}</h2>
        {post.body && <p className="fo-post__body">{post.body}</p>}
        {post.photo && (
          <div className="fo-post__photo" role="img" aria-label={post.photo}>
            <span>{post.photo}</span>
          </div>
        )}

        <div className="fo-post__foot">
          <span className="fo-chip fo-chip--static">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /></svg>
            {post.comments} {t('forum.comments')}
          </span>
          <button type="button" className="fo-chip" onClick={() => onShare(post.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" /></svg>
            {t('forum.share')}
          </button>
          <button
            type="button"
            className={`fo-chip ${post.saved ? 'is-active' : ''}`}
            aria-pressed={post.saved}
            onClick={() => onSave(post.id)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
            {t('forum.savePost')}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Forum() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState(() => SEED.map((p) => ({ ...p, myVote: 0, saved: false })));
  const [sort, setSort] = useState('hot');
  const [draft, setDraft] = useState('');
  const [community, setCommunity] = useState(COMMUNITIES[0].name);
  const [joined, setJoined] = useState(() =>
    Object.fromEntries(COMMUNITIES.map((c) => [c.name, c.joined]))
  );
  const [toast, setToast] = useState('');
  const inputRef = useRef(null);
  const toastTimer = useRef(null);

  const flash = (msg) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2200);
  };

  const sorted = useMemo(() => {
    const score = (p) => p.votes + p.myVote;
    const copy = [...posts];
    copy.sort((a, b) => {
      if (sort === 'top') return score(b) - score(a);
      if (sort === 'new') return b.id - a.id;
      if (sort === 'rising') return b.comments - a.comments;
      return score(b) + b.comments - (score(a) + a.comments); // hot
    });
    return copy;
  }, [posts, sort]);

  const vote = (id, dir) =>
    setPosts((list) =>
      list.map((p) => (p.id === id ? { ...p, myVote: p.myVote === dir ? 0 : dir } : p))
    );

  const toggleSave = (id) =>
    setPosts((list) => list.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));

  const toggleJoin = (name) => setJoined((j) => ({ ...j, [name]: !j[name] }));

  const share = (id) => {
    const url = `${window.location.origin}/forum#post-${id}`;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).catch(() => {});
    flash(t('common.linkCopied'));
  };

  const startThread = () => {
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const submit = (e) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    const post = {
      id: nextId(),
      community,
      author: t('forum.you'),
      time: t('forum.now'),
      title,
      tag: 'New',
      votes: 1,
      comments: 0,
      myVote: 1,
      saved: false,
    };
    setPosts((list) => [post, ...list]);
    setDraft('');
    setSort('new');
  };

  return (
    <div className="fo">
      <div className="fo-grid">
        {/* ===== FEED ===== */}
        <main className="fo-feed">
          <header className="fo-head">
            <div>
              <h1 className="fo-head__title">{t('forum.title')}</h1>
              <p className="fo-head__sub">{t('forum.subtitle')}</p>
            </div>
            <button type="button" className="fo-new" onClick={startThread}>
              <span>＋ {t('forum.newPost')}</span>
            </button>
          </header>

          {/* composer — expands into a community picker + Post once you type */}
          <div className="fo-bar">
            <form className={`fo-composer ${draft.trim() ? 'is-open' : ''}`} onSubmit={submit}>
              <div className="fo-composer__row">
                <KookaAvatar size="sm" />
                <input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('forum.titlePh')}
                  aria-label={t('forum.newPost')}
                />
              </div>
              {draft.trim() && (
                <div className="fo-composer__actions">
                  <label className="fo-composer__pick">
                    {t('forum.pickCommunity')}
                    <select value={community} onChange={(e) => setCommunity(e.target.value)}>
                      {COMMUNITIES.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="fo-composer__cancel" onClick={() => setDraft('')}>
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="fo-composer__post">{t('common.post')}</button>
                </div>
              )}
            </form>

            <div className="fo-sort" role="tablist" aria-label="sort">
              {SORTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={sort === s}
                  className={`fo-sort__btn ${sort === s ? 'is-active' : ''}`}
                  onClick={() => setSort(s)}
                >
                  {t(`forum.sort.${s}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="fo-posts">
            {sorted.map((p) => (
              <Post key={p.id} post={p} onVote={vote} onSave={toggleSave} onShare={share} t={t} />
            ))}
          </div>
        </main>

        {/* ===== CONTEXT RAIL ===== */}
        <aside className="fo-rail">
          <section className="fo-panel fo-panel--dark">
            <h3 className="fo-panel__title">{t('forum.communitiesTitle')}</h3>
            <ul className="fo-comm">
              {COMMUNITIES.map((c) => (
                <li key={c.name}>
                  <span className="fo-comm__badge" aria-hidden="true">
                    {c.name.replace('k/', '').slice(0, 1)}
                  </span>
                  <span className="fo-comm__meta">
                    <b>{c.name}</b>
                    <small>{c.members} {t('forum.members')}</small>
                  </span>
                  <button
                    type="button"
                    className={`fo-join ${joined[c.name] ? 'is-joined' : ''}`}
                    aria-pressed={joined[c.name]}
                    onClick={() => toggleJoin(c.name)}
                  >
                    {joined[c.name] ? t('forum.joined') : t('forum.join')}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="fo-panel">
            <h3 className="fo-panel__title">{t('forum.trendingTitle')}</h3>
            <ol className="fo-trend">
              {TRENDING.map((x, i) => (
                <li key={x.tag}>
                  <button type="button" className="fo-trend__btn" onClick={() => setSort('rising')}>
                    <span className="fo-trend__rank">{i + 1}</span>
                    <span className="fo-trend__body">
                      <b>#{x.tag}</b>
                      <small>{x.posts} {t('forum.comments')}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <section className="fo-panel fo-panel--rules">
            <h3 className="fo-panel__title">{t('forum.rulesTitle')}</h3>
            <ul className="fo-rules">
              {t('forum.rules', { returnObjects: true }).map((r, i) => (
                <li key={i}><span>{i + 1}</span>{r}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <Toast message={toast} />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../settings';
import { useUser, refreshUser } from '../../user';
import {
  updateProfile, getUser, getUserRecipes, getPassport, getUserActivity, follow, unfollow,
} from '../../services/users';
import { countryOf } from '../../data/countries';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import ImageUpload from '../../components/ImageUpload';
import WorldGlobe from '../../components/WorldGlobe';
import './Profile.css';

/* ==========================================================================
   PROFILE — the live cook profile. `/profile` is your own (editable, sourced
   from the shared settings store + GET /me); `/profile/:id` shows someone else
   (read-only, from GET /users/:id). Private accounts you don't follow collapse
   to just their name + username over the cover. Recipes, culinary passport and
   activity are pulled from the backend; the passport tab shows the globe inline.
   ========================================================================== */

const ACTIVITY_ICONS = { created: '📖', reviewed: '⭐', cooked: '🍳' };

/* compact relative time from an ISO timestamp */
function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'now';
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return `${Math.floor(d / 30)}mo`;
}

const BADGES = [
  { icon: '🔪', name: 'Clean Cuts', got: true },
  { icon: '🔥', name: 'Sear Master', got: true },
  { icon: '🥚', name: 'Egg Whisperer', got: true },
  { icon: '🌶️', name: 'Heat Seeker', got: true },
  { icon: '🍞', name: 'Crust Club', got: false },
  { icon: '🫙', name: 'Funk Lord', got: false },
];

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [settings, update] = useSettings();
  const [me] = useUser();

  const isSelf = !id || (me && Number(id) === me.id);
  const targetId = id ? Number(id) : me?.id;

  const [tab, setTab] = useState('activity');
  const [other, setOther] = useState(null);        // fetched user for /profile/:id
  const [following, setFollowing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [draft, setDraft] = useState({ name: '', username: '', bio: '', avatar: '', cover: '' });
  const [reloadTick, setReloadTick] = useState(0);

  // live backend data
  const [liveRecipes, setLiveRecipes] = useState([]);
  const [passport, setPassport] = useState({ countries: [], total: 0 });
  const [activity, setActivity] = useState([]);

  const menuRef = useRef(null);

  // always keep our own account fresh (also hydrates the settings store)
  useEffect(() => {
    refreshUser();
  }, []);

  // load the target profile + its content
  useEffect(() => {
    if (!targetId) return undefined;
    let alive = true;

    const loadContent = () => {
      getUserRecipes(targetId).then((r) => { if (alive) setLiveRecipes(r || []); }).catch(() => {});
      getPassport(targetId).then((p) => { if (alive) setPassport(p || { countries: [], total: 0 }); }).catch(() => {});
      getUserActivity(targetId).then((a) => { if (alive) setActivity(a || []); }).catch(() => {});
    };

    const run = async () => {
      if (isSelf) {
        setOther(null);
        loadContent();
        return;
      }
      try {
        const u = await getUser(targetId);
        if (!alive) return;
        setOther(u);
        setFollowing(!!u.is_following);
        if (u.locked) {
          setLiveRecipes([]);
          setPassport({ countries: [], total: 0 });
          setActivity([]);
        } else {
          loadContent();
        }
      } catch {
        /* leave prior state */
      }
    };

    run();
    return () => { alive = false; };
  }, [targetId, isSelf, reloadTick]);

  // close the kebab menu on an outside click
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const flash = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  };

  // ----- unified view model: self reads from the store, others from `other` --
  const p = isSelf
    ? {
        name: settings.name,
        username: settings.username,
        bio: settings.bio,
        avatar: settings.avatar,
        cover: settings.cover,
        level: me?.level ?? 1,
        followers: me?.followers ?? 0,
        recipe_count: me?.recipe_count ?? 0,
        created_at: me?.created_at,
        private: settings.privateAccount,
        locked: false,
      }
    : {
        name: other?.full_name || '',
        username: other?.username || '',
        bio: other?.bio || '',
        avatar: other?.avatar_url || '',
        cover: other?.cover_url || '',
        level: other?.level ?? 1,
        followers: other?.followers ?? 0,
        recipe_count: other?.recipe_count ?? 0,
        created_at: other?.created_at,
        private: other?.private,
        locked: !!other?.locked,
      };

  const share = () => {
    const url = `${window.location.origin}/profile${isSelf ? '' : `/${targetId}`}`;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).catch(() => {});
    setMenuOpen(false);
    flash(t('common.linkCopied'));
  };

  const openEdit = () => {
    setDraft({
      name: settings.name,
      username: settings.username,
      bio: settings.bio ?? '',
      avatar: settings.avatar ?? '',
      cover: settings.cover ?? '',
    });
    setMenuOpen(false);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const data = await updateProfile({
        full_name: draft.name.trim() || settings.name,
        username: draft.username.trim().replace(/^@/, '') || settings.username,
        bio: draft.bio,
        avatar_url: draft.avatar ?? '',
        cover_url: draft.cover ?? '',
      });
      // reflect immediately in the shared store (Profile + Settings stay in sync)
      update({
        name: data.full_name,
        username: data.username,
        bio: data.bio ?? '',
        avatar: data.avatar_url ?? '',
        cover: data.cover_url ?? '',
      });
      refreshUser(); // refresh stats too
      setEditOpen(false);
      flash(t('profile.savedToast'));
    } catch (err) {
      const detail = err?.response?.data?.detail;
      flash(typeof detail === 'string' ? detail : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const openSettings = () => {
    setMenuOpen(false);
    navigate('/settings');
  };

  const toggleFollow = async () => {
    const next = !following;
    setFollowing(next);
    try {
      if (next) await follow(targetId);
      else await unfollow(targetId);
      setReloadTick((n) => n + 1); // refetch (a private account may now unlock)
    } catch {
      setFollowing(!next);
      flash(t('common.error'));
    }
  };

  const TABS = ['activity', 'recipes', 'passport', 'badges'];
  const initials = (p.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2);
  const aboutText = p.bio || (isSelf ? t('profile.about') : '');
  const joined = p.created_at ? new Date(p.created_at).getFullYear() : '';
  const countriesTotal = passport?.total ?? 0;

  const stats = {
    recipes: p.recipe_count,
    streak: 0,
    countries: countriesTotal,
    followers: p.followers,
  };

  const recipeList = (liveRecipes || []).map((r) => ({
    id: r.id,
    name: r.title,
    meta: [r.meta?.time, r.meta?.kcal].filter(Boolean).join(' · '),
    times: r.saves ?? 0,
    image: r.image_url || '',
  }));

  const passportList = (passport?.countries || [])
    .slice()
    .sort((a, b) => b.count - a.count)
    .map((c) => {
      const info = countryOf(c.country);
      return { code: c.country, flag: info.flag, name: info.name, dishes: c.count };
    });
  const visitedCodes = passportList.map((c) => c.code);

  const avatarNode = p.avatar
    ? <img className="pf-avatar__img" src={p.avatar} alt="" />
    : initials;
  const coverStyle = p.cover ? { backgroundImage: `url(${p.cover})` } : undefined;

  // ===== PRIVATE / LOCKED VIEW (someone else's private account) =====
  if (!isSelf && p.locked) {
    return (
      <div className="pf pf--locked">
        <header className="pf-head">
          <div className="pf-cover pf-cover--identity" style={coverStyle}>
            <div className="pf-cover__id">
              <h1 className="pf-cover__name">{p.name}</h1>
              <p className="pf-cover__handle">@{p.username}</p>
            </div>
          </div>
        </header>

        <div className="pf-locked">
          <span className="pf-locked__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M6 10V8a6 6 0 0 1 12 0v2M5 10h14v10H5z" /></svg>
          </span>
          <h2>{t('profile.privateTitle')}</h2>
          <p>{t('profile.privateNote')}</p>
          <button
            type="button"
            className={`pf-follow ${following ? 'is-following' : ''}`}
            aria-pressed={following}
            onClick={toggleFollow}
          >
            {following ? t('profile.following') : t('profile.follow')}
          </button>
        </div>

        <Toast message={toast} />
      </div>
    );
  }

  return (
    <div className="pf">
      {/* ===== HEADER ===== */}
      <header className="pf-head">
        <div className={`pf-cover ${p.cover ? 'pf-cover--photo' : ''}`} style={coverStyle} aria-hidden="true" />

        <div className="pf-head__row">
          <div className="pf-avatar" aria-hidden="true">
            {avatarNode}
            <span className="pf-avatar__level">{p.level}</span>
          </div>

          <div className="pf-id">
            <h1 className="pf-name">
              {p.name}
              {p.private && (
                <span className="pf-private" title={t('settings.privacy.private')} aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M6 10V8a6 6 0 0 1 12 0v2M5 10h14v10H5z" /></svg>
                </span>
              )}
            </h1>
            <p className="pf-handle">
              @{p.username}
              {joined && <><span className="pf-dot" />{t('profile.joinedIn')} {joined}</>}
            </p>
          </div>

          <div className="pf-actions">
            {!isSelf && (
              <button
                type="button"
                className={`pf-follow ${following ? 'is-following' : ''}`}
                aria-pressed={following}
                onClick={toggleFollow}
              >
                {following ? t('profile.following') : t('profile.follow')}
              </button>
            )}

            <div className="pf-more" ref={menuRef}>
              <button
                type="button"
                className="pf-more__btn"
                aria-label="more"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                </svg>
              </button>
              {menuOpen && (
                <div className="pf-menu" role="menu">
                  {isSelf && <button type="button" role="menuitem" onClick={openEdit}>{t('profile.edit')}</button>}
                  <button type="button" role="menuitem" onClick={share}>{t('profile.share')}</button>
                  {isSelf && <button type="button" role="menuitem" onClick={openSettings}>{t('profile.settings')}</button>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* stat strip */}
        <div className="pf-stats">
          {['recipes', 'streak', 'countries', 'followers'].map((k) => (
            <div className="pf-stat" key={k}>
              <b>{stats[k]}</b>
              <span>{t(`profile.stats.${k}`)}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ===== BODY ===== */}
      <div className="pf-body">
        <main className="pf-main">
          <div className="pf-tabs" role="tablist">
            {TABS.map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                className={`pf-tab ${tab === k ? 'is-active' : ''}`}
                onClick={() => setTab(k)}
              >
                {t(`profile.tabs.${k}`)}
              </button>
            ))}
          </div>

          {tab === 'activity' && (
            activity.length === 0 ? (
              <p className="pf-empty">{t('profile.activityEmpty')}</p>
            ) : (
              <ul className="pf-activity">
                {activity.map((a, i) => (
                  <li
                    key={i}
                    className={a.recipe_id ? 'is-clickable' : ''}
                    onClick={() => a.recipe_id && navigate(`/recipe/${a.recipe_id}`)}
                  >
                    <span className="pf-activity__icon" aria-hidden="true">{ACTIVITY_ICONS[a.kind] || '•'}</span>
                    <span className="pf-activity__text">
                      {t(`profile.${a.kind}`)} <b>{a.what}</b>
                    </span>
                    <span className="pf-activity__when">{timeAgo(a.when)}</span>
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === 'recipes' && (
            recipeList.length === 0 ? (
              <p className="pf-empty">{t('profile.recipesEmpty')}</p>
            ) : (
              <div className="pf-recipes">
                {recipeList.map((r, i) => (
                  <article
                    className="pf-recipe"
                    key={r.name + i}
                    onClick={() => r.id && navigate(`/recipe/${r.id}`)}
                  >
                    <div
                      className="pf-recipe__photo"
                      aria-hidden="true"
                      style={r.image ? { backgroundImage: `url(${r.image})` } : undefined}
                    >
                      {r.times > 0 && <span className="pf-recipe__times">×{r.times}</span>}
                    </div>
                    <h3>{r.name}</h3>
                    <span>{r.meta}</span>
                  </article>
                ))}
              </div>
            )
          )}

          {tab === 'passport' && (
            <div className="pf-passport-tab">
              <div className="pf-globe">
                <WorldGlobe visited={visitedCodes} size={320} />
                <p className="pf-globe__hint">{t('passport.spin')}</p>
              </div>
              {passportList.length === 0 ? (
                <p className="pf-empty">{t('passport.empty')}</p>
              ) : (
                <div className="pf-passport">
                  {passportList.map((c) => (
                    <div className="pf-stamp" key={c.name}>
                      <span className="pf-stamp__flag" aria-hidden="true">{c.flag}</span>
                      <b>{c.name}</b>
                      <small>{c.dishes} {t('profile.tabs.recipes').toLowerCase()}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'badges' && (
            <div className="pf-badges">
              {BADGES.map((b) => (
                <div className={`pf-badge ${b.got ? '' : 'is-locked'}`} key={b.name}>
                  <span className="pf-badge__icon" aria-hidden="true">{b.icon}</span>
                  <b>{b.name}</b>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* rail */}
        <aside className="pf-rail">
          <section className="pf-card">
            <div className="pf-card__head">
              <h3 className="pf-card__title">{t('profile.aboutTitle')}</h3>
              {isSelf && <button type="button" className="pf-link" onClick={openEdit}>{t('profile.edit')}</button>}
            </div>
            <p className="pf-about">{aboutText || t('profile.aboutEmpty')}</p>
          </section>

          <section className="pf-card pf-card--next">
            <h3 className="pf-card__title">{t('profile.nextBadge')}</h3>
            <div className="pf-next">
              <span className="pf-next__icon" aria-hidden="true">🌍</span>
              <div className="pf-next__body">
                <b>Globetrotter</b>
                <div className="pf-next__bar">
                  <i style={{ width: `${Math.min(100, (countriesTotal / 25) * 100)}%` }} />
                </div>
                <small>{countriesTotal} / 25 {t('profile.stats.countries').toLowerCase()}</small>
              </div>
            </div>
          </section>

          <section className="pf-card">
            <div className="pf-card__head">
              <h3 className="pf-card__title">{t('profile.passportTitle')}</h3>
              <button type="button" className="pf-link" onClick={() => setTab('passport')}>
                {t('profile.viewAll')}
              </button>
            </div>
            {passportList.length === 0 ? (
              <p className="pf-flags__sub">{t('passport.empty')}</p>
            ) : (
              <>
                <div className="pf-flags">
                  {passportList.slice(0, 6).map((c) => (
                    <span key={c.name} className="pf-flag" title={c.name}>{c.flag}</span>
                  ))}
                  {countriesTotal > 6 && (
                    <span className="pf-flag pf-flag--more">+{countriesTotal - 6}</span>
                  )}
                </div>
                <p className="pf-flags__sub">{countriesTotal} {t('profile.passportSub')}</p>
              </>
            )}
          </section>
        </aside>
      </div>

      {/* ===== QUICK-EDIT MODAL (self only) ===== */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('profile.edit')}
        footer={
          <>
            <button type="button" className="kbtn kbtn--ghost" onClick={() => setEditOpen(false)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="kbtn kbtn--primary" onClick={saveEdit} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <div className="kfield">
          <label>{t('profile.editCover')}</label>
          <ImageUpload
            value={draft.cover}
            onChange={(url) => setDraft((d) => ({ ...d, cover: url }))}
            folder="/kooka/covers"
          />
        </div>
        <div className="kfield">
          <label>{t('profile.editAvatar')}</label>
          <ImageUpload
            value={draft.avatar}
            onChange={(url) => setDraft((d) => ({ ...d, avatar: url }))}
            folder="/kooka/avatars"
          />
        </div>
        <div className="kfield">
          <label htmlFor="pf-edit-name">{t('profile.editName')}</label>
          <input
            id="pf-edit-name"
            className="kinput"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </div>
        <div className="kfield">
          <label htmlFor="pf-edit-handle">{t('profile.editHandle')}</label>
          <input
            id="pf-edit-handle"
            className="kinput"
            value={draft.username}
            onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
          />
        </div>
        <div className="kfield">
          <label htmlFor="pf-edit-about">{t('profile.editAbout')}</label>
          <textarea
            id="pf-edit-about"
            className="ktextarea"
            value={draft.bio}
            onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
          />
        </div>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}

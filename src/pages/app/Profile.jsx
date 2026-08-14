import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../settings';
import { useUser, refreshUser } from '../../user';
import { updateProfile, getUserRecipes, getPassport } from '../../services/users';
import { countryOf } from '../../data/countries';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import './Profile.css';

/* ==========================================================================
   PROFILE — the signed-in cook's profile, backed by the live account. Identity
   and stats come from GET /me (refreshed on mount, mirrored into the shared
   settings store so edits here and on Settings stay in sync). Recipes and the
   culinary passport are pulled from the backend, falling back to sample data
   when it is unreachable. Activity and badges stay illustrative for now.
   ========================================================================== */

const BASE = {
  joined: '2024',
  level: 7,
  stats: { recipes: 142, streak: 23, countries: 18, followers: '1.2k' },
};

const ACTIVITY = [
  { kind: 'cooked', what: 'Pasta carbonara', when: '2h', icon: '🍝' },
  { kind: 'unlocked', what: 'Emulsion Whisperer', when: '1d', icon: '🎖️' },
  { kind: 'reviewed', what: 'Grilled chicken with new potatoes', when: '2d', icon: '⭐' },
  { kind: 'posted', what: 'k/CarbonaraLaw', when: '3d', icon: '💬' },
  { kind: 'cooked', what: 'Roasted pepper cream soup', when: '4d', icon: '🥣' },
];

const RECIPES = [
  { name: 'Pasta carbonara', meta: '25 min · 620 kcal', times: 6 },
  { name: 'Hot honey chicken', meta: '1h 30m · 710 kcal', times: 3 },
  { name: 'Zucchini & feta bake', meta: '40 min · 310 kcal', times: 4 },
  { name: 'Charred pepper soup', meta: '30 min · 260 kcal', times: 2 },
];

const PASSPORT = [
  { flag: '🇮🇹', name: 'Italy', dishes: 12 },
  { flag: '🇯🇵', name: 'Japan', dishes: 7 },
  { flag: '🇲🇽', name: 'Mexico', dishes: 6 },
  { flag: '🇹🇭', name: 'Thailand', dishes: 5 },
  { flag: '🇫🇷', name: 'France', dishes: 5 },
  { flag: '🇮🇳', name: 'India', dishes: 4 },
  { flag: '🇬🇷', name: 'Greece', dishes: 3 },
  { flag: '🇰🇷', name: 'Korea', dishes: 3 },
];

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
  const [settings, update] = useSettings();
  const [user] = useUser();

  const [tab, setTab] = useState('activity');
  const [following, setFollowing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [draft, setDraft] = useState({ name: '', username: '', bio: '' });

  // live backend data (null until loaded; falls back to sample data)
  const [liveRecipes, setLiveRecipes] = useState(null);
  const [passport, setPassport] = useState(null);

  const menuRef = useRef(null);

  // pull the authoritative account on mount (also hydrates the settings store)
  useEffect(() => {
    refreshUser();
  }, []);

  // once we know the user id, load their recipes + culinary passport
  useEffect(() => {
    if (!user?.id) return undefined;
    let alive = true;
    getUserRecipes(user.id).then((r) => { if (alive) setLiveRecipes(r); }).catch(() => {});
    getPassport(user.id).then((p) => { if (alive) setPassport(p); }).catch(() => {});
    return () => { alive = false; };
  }, [user?.id]);

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

  const share = () => {
    const url = `${window.location.origin}/profile`;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).catch(() => {});
    setMenuOpen(false);
    flash(t('common.linkCopied'));
  };

  const openEdit = () => {
    setDraft({ name: settings.name, username: settings.username, bio: settings.bio ?? '' });
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
      });
      update({
        name: data.full_name,
        username: data.username,
        bio: data.bio ?? '',
      });
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

  const TABS = ['activity', 'recipes', 'passport', 'badges'];
  const initials = (settings.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2);
  const aboutText = settings.bio || t('profile.about');

  // ----- derived, backend-first with graceful fallback to sample data -----
  const level = user?.level ?? BASE.level;
  const joined = user?.created_at ? new Date(user.created_at).getFullYear() : BASE.joined;

  const countriesTotal = passport?.total ?? BASE.stats.countries;
  const stats = {
    recipes: user?.recipe_count ?? BASE.stats.recipes,
    streak: BASE.stats.streak, // no backend metric yet
    countries: countriesTotal,
    followers: user?.followers ?? BASE.stats.followers,
  };

  const recipeList = liveRecipes?.length
    ? liveRecipes.map((r) => ({
        name: r.title,
        meta: [r.meta?.time, r.meta?.kcal].filter(Boolean).join(' · '),
        times: r.saves ?? 0,
        image: r.image_url || '',
      }))
    : RECIPES;

  const passportList = passport?.countries?.length
    ? passport.countries
        .slice()
        .sort((a, b) => b.count - a.count)
        .map((c) => {
          const info = countryOf(c.country);
          return { flag: info.flag, name: info.name, dishes: c.count };
        })
    : PASSPORT;

  return (
    <div className="pf">
      {/* ===== HEADER ===== */}
      <header className="pf-head">
        <div className="pf-cover" aria-hidden="true" />

        <div className="pf-head__row">
          <div className="pf-avatar" aria-hidden="true">
            {initials}
            <span className="pf-avatar__level">{level}</span>
          </div>

          <div className="pf-id">
            <h1 className="pf-name">
              {settings.name}
              {settings.privateAccount && (
                <span className="pf-private" title={t('settings.privacy.private')} aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M6 10V8a6 6 0 0 1 12 0v2M5 10h14v10H5z" /></svg>
                </span>
              )}
            </h1>
            <p className="pf-handle">
              @{settings.username}
              <span className="pf-dot" />
              {t('profile.joinedIn')} {joined}
            </p>
          </div>

          <div className="pf-actions">
            <button
              type="button"
              className={`pf-follow ${following ? 'is-following' : ''}`}
              aria-pressed={following}
              onClick={() => setFollowing((v) => !v)}
            >
              {following ? t('profile.following') : t('profile.follow')}
            </button>

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
                  <button type="button" role="menuitem" onClick={openEdit}>{t('profile.edit')}</button>
                  <button type="button" role="menuitem" onClick={share}>{t('profile.share')}</button>
                  <button type="button" role="menuitem" onClick={openSettings}>{t('profile.settings')}</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* stat strip — plain numbers, no gradient text */}
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
        {/* main column */}
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
            <ul className="pf-activity">
              {ACTIVITY.map((a, i) => (
                <li key={i}>
                  <span className="pf-activity__icon" aria-hidden="true">{a.icon}</span>
                  <span className="pf-activity__text">
                    {t(`profile.${a.kind}`)} <b>{a.what}</b>
                  </span>
                  <span className="pf-activity__when">{a.when}</span>
                </li>
              ))}
            </ul>
          )}

          {tab === 'recipes' && (
            <div className="pf-recipes">
              {recipeList.map((r, i) => (
                <article className="pf-recipe" key={r.name + i}>
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
          )}

          {tab === 'passport' && (
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
              <button type="button" className="pf-link" onClick={openEdit}>{t('profile.edit')}</button>
            </div>
            <p className="pf-about">{aboutText}</p>
          </section>

          <section className="pf-card pf-card--next">
            <h3 className="pf-card__title">{t('profile.nextBadge')}</h3>
            <div className="pf-next">
              <span className="pf-next__icon" aria-hidden="true">🌍</span>
              <div className="pf-next__body">
                <b>Globetrotter</b>
                <div className="pf-next__bar"><i style={{ width: '72%' }} /></div>
                <small>18 / 25 {t('profile.stats.countries').toLowerCase()}</small>
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
            <div className="pf-flags">
              {passportList.slice(0, 6).map((c) => (
                <span key={c.name} className="pf-flag" title={c.name}>{c.flag}</span>
              ))}
              {countriesTotal > 6 && (
                <span className="pf-flag pf-flag--more">+{countriesTotal - 6}</span>
              )}
            </div>
            <p className="pf-flags__sub">{countriesTotal} {t('profile.passportSub')}</p>
          </section>
        </aside>
      </div>

      {/* ===== QUICK-EDIT MODAL ===== */}
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

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings, applyTheme, settingsBlob } from '../../settings';
import {
  refreshUser, logout as logoutUser, useUser, markAllergiesAnswered,
} from '../../user';
import {
  updateProfile, changePassword, checkAvailability, getBlocked, unblockUser,
  getAllergenCatalog,
} from '../../services/users';
import { ALLERGENS } from '../../lib/allergens';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import './Settings.css';

/* ==========================================================================
   SETTINGS — social-media-style settings screen. Category rail on the left,
   the active section's controls on the right. Wired to the backend: account,
   appearance, privacy and notification changes are persisted through
   PATCH /me (the shared settings store mirrors them so the profile stays in
   sync). Sessions and the blocked list have no backend model yet, so they
   remain local for now.
   ========================================================================== */

const SECTIONS = [
  'account', 'allergies', 'privacy', 'notifications', 'appearance',
  'security', 'blocked',
];

const SECTION_ICONS = {
  account: '👤',
  allergies: '🥜',
  privacy: '🔒',
  notifications: '🔔',
  appearance: '🎨',
  security: '🛡️',
  blocked: '🚫',
};

/* seed mock data — no backend model for these yet */
const SEED_SESSIONS = [
  { id: 's1', device: 'Chrome · Windows', where: 'Bucharest, RO', current: true },
  { id: 's2', device: 'Kooka for iOS', where: 'Cluj-Napoca, RO', current: false },
  { id: 's3', device: 'Safari · macOS', where: 'Berlin, DE', current: false },
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      className={`st-switch ${on ? 'is-on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    />
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="st-row">
      <div className="st-row__text">
        <span className="st-row__label">{label}</span>
        {hint && <span className="st-row__hint">{hint}</span>}
      </div>
      <div className="st-row__control">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [settings, update] = useSettings();

  /* `?section=` lets other screens land you on the right pane — the allergen
     filter on Home sends you straight to the form it needs filled in, rather
     than to Settings in general. */
  const [params] = useSearchParams();
  const requested = params.get('section');
  const [active, setActive] = useState(
    SECTIONS.includes(requested) ? requested : 'account',
  );
  const [toast, setToast] = useState('');
  const [sessions, setSessions] = useState(SEED_SESSIONS);
  const [blocked, setBlocked] = useState([]);
  const [blockedLoaded, setBlockedLoaded] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  /* Allergies are a column on the account, not part of the client-preference
     blob — the backend matches recipe allergens against them, so they have to
     be real data rather than a display setting. `picked` is the working copy;
     nothing is sent until Save. */
  const [me] = useUser();
  const [catalog, setCatalog] = useState(ALLERGENS);
  const [picked, setPicked] = useState([]);
  const [savingAllergies, setSavingAllergies] = useState(false);

  // password modal
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErr, setPwErr] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // account draft — committed on Save
  const [draft, setDraft] = useState({
    name: settings.name,
    username: settings.username,
    email: settings.email,
    bio: settings.bio ?? '',
  });

  // Re-seed the draft when the stored identity changes (after hydration from
  // GET /me or a save). This "adjust state during render" pattern keeps the
  // form in sync without an effect; typing only mutates `draft`, so it never
  // clobbers user input (typing doesn't change the identity signature).
  const identitySig = `${settings.name}|${settings.username}|${settings.email}|${settings.bio ?? ''}`;
  const [seededSig, setSeededSig] = useState(identitySig);
  if (identitySig !== seededSig) {
    setSeededSig(identitySig);
    setDraft({
      name: settings.name,
      username: settings.username,
      email: settings.email,
      bio: settings.bio ?? '',
    });
  }

  /* Same live check as signup, but the backend excludes the signed-in account,
     so your own handle never comes back as "taken". Each verdict is tagged with
     the value it answered and compared against the box on render, so a slow
     reply cannot mislabel a value you have since changed. */
  const [usernameCheck, setUsernameCheck] = useState(null);
  const [emailCheck, setEmailCheck] = useState(null);

  const draftUsername = draft.username.trim().replace(/^@/, '');
  const draftEmail = draft.email.trim();

  useEffect(() => {
    if (draftUsername.length < 3 || draftUsername === settings.username) return undefined;
    let cancelled = false;
    const id = window.setTimeout(async () => {
      try {
        const res = await checkAvailability({ username: draftUsername });
        if (!cancelled) setUsernameCheck({ value: draftUsername, taken: !!res.username_taken });
      } catch { /* offline: let the save decide */ }
    }, 450);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, [draftUsername, settings.username]);

  useEffect(() => {
    if (!EMAIL_RE.test(draftEmail) || draftEmail === settings.email) return undefined;
    let cancelled = false;
    const id = window.setTimeout(async () => {
      try {
        const res = await checkAvailability({ email: draftEmail });
        if (!cancelled) setEmailCheck({ value: draftEmail, taken: !!res.email_taken });
      } catch { /* offline: let the save decide */ }
    }, 450);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, [draftEmail, settings.email]);

  const availOf = (check, value, unchanged) => {
    if (unchanged) return 'idle';
    if (!check || check.value !== value) return 'idle';
    return check.taken ? 'taken' : 'free';
  };
  const usernameState = availOf(usernameCheck, draftUsername, draftUsername === settings.username);
  const emailState = availOf(emailCheck, draftEmail, draftEmail === settings.email);
  const accountBlocked = usernameState === 'taken' || emailState === 'taken';

  // pull the live account from the backend on mount so the form + toggles
  // reflect the real user; hydrateFromUser() (inside refreshUser) updates the
  // shared store, which flows back here through useSettings().
  useEffect(() => {
    refreshUser();
  }, []);

  // the catalogue is the same list the backend matches against; the local
  // mirror in lib/allergens.js paints first and covers a failed call
  useEffect(() => {
    let alive = true;
    getAllergenCatalog()
      .then((list) => { if (alive && list.length) setCatalog(list); })
      .catch(() => { /* mirror already on screen */ });
    return () => { alive = false; };
  }, []);

  /* Re-seed the working copy whenever the saved list changes — the same
     adjust-during-render pattern the account form uses, so a fresh GET /me
     never fights with what is on screen. */
  const savedAllergies = (me?.allergies || []).join(',');
  const [seededAllergies, setSeededAllergies] = useState(null);
  if (savedAllergies !== seededAllergies) {
    setSeededAllergies(savedAllergies);
    setPicked(me?.allergies || []);
  }

  // the blocked list is real data now, so load it when that section is opened
  useEffect(() => {
    if (active !== 'blocked' || blockedLoaded) return undefined;
    let alive = true;
    getBlocked()
      .then((list) => { if (alive) { setBlocked(list || []); setBlockedLoaded(true); } })
      .catch(() => { if (alive) setBlockedLoaded(true); });
    return () => { alive = false; };
  }, [active, blockedLoaded]);

  const flash = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  };

  const errText = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    return typeof detail === 'string' ? detail : fallback;
  };

  const unblock = async (u) => {
    const before = blocked;
    setBlocked((list) => list.filter((x) => x.id !== u.id));
    try {
      await unblockUser(u.id);
      flash(t('settings.blocked.unblocked', { name: u.username }));
    } catch {
      setBlocked(before);
      flash(t('common.error'));
    }
  };

  const logout = () => {
    logoutUser();
    navigate('/login');
  };

  const saveAccount = async () => {
    if (accountBlocked) {
      flash(t(usernameState === 'taken'
        ? 'auth.signup.errUsernameTaken'
        : 'auth.signup.errEmailTaken'));
      return;
    }
    setSavingAccount(true);
    try {
      const data = await updateProfile({
        full_name: draft.name.trim() || settings.name,
        username: draft.username.trim().replace(/^@/, '') || settings.username,
        email: draft.email.trim() || settings.email,
        bio: draft.bio,
      });
      // reflect the authoritative response locally
      update({
        name: data.full_name,
        username: data.username,
        email: data.email ?? draft.email.trim(),
        bio: data.bio ?? '',
      });
      flash(t('settings.account.saved'));
    } catch (err) {
      flash(errText(err, t('common.error')));
    } finally {
      setSavingAccount(false);
    }
  };

  const toggleAllergy = (id) =>
    setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const saveAllergies = async () => {
    setSavingAllergies(true);
    try {
      await updateProfile({ allergies: picked });
      await refreshUser(); // the feed filters read this off the cached account
      markAllergiesAnswered();
      flash(t('settings.allergies.saved'));
    } catch (err) {
      flash(errText(err, t('common.error')));
    } finally {
      setSavingAllergies(false);
    }
  };

  const confirmNoAllergies = async () => {
    setSavingAllergies(true);
    try {
      setPicked([]);
      await updateProfile({ allergies: [] });
      await refreshUser();
      markAllergiesAnswered();
      flash(t('settings.allergies.noneSaved'));
    } catch (err) {
      flash(errText(err, t('common.error')));
    } finally {
      setSavingAllergies(false);
    }
  };

  // persist the client-preference blob (privacy + notifications) to the backend
  const syncPrefs = (next) => {
    updateProfile({ settings: settingsBlob(next) }).catch(() => {
      /* best-effort: the local store already updated, UI stays responsive */
    });
  };

  const setPref = (patch) => {
    const next = { ...settings, ...patch };
    update(patch);
    syncPrefs(next);
  };

  const setNotif = (key, value) => {
    const next = { ...settings, notif: { ...settings.notif, [key]: value } };
    update((s) => ({ ...s, notif: { ...s.notif, [key]: value } }));
    syncPrefs(next);
  };

  const setTheme = (theme) => {
    update({ theme });
    applyTheme(theme);
    updateProfile({ theme }).catch(() => {});
  };

  const setLanguage = (lng) => {
    i18n.changeLanguage(lng);
    update({ language: lng });
    updateProfile({ language: lng }).catch(() => {});
  };

  const openPassword = () => {
    setPw({ current: '', next: '', confirm: '' });
    setPwErr('');
    setPwOpen(true);
  };

  const submitPassword = async () => {
    setPwErr('');
    if (!pw.current || !pw.next) {
      setPwErr(t('settings.security.pwRequired'));
      return;
    }
    if (pw.next.length < 6) {
      setPwErr(t('settings.security.pwTooShort'));
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwErr(t('settings.security.pwMismatch'));
      return;
    }
    setPwSaving(true);
    try {
      await changePassword({ current_password: pw.current, new_password: pw.next });
      setPwOpen(false);
      flash(t('settings.security.pwChanged'));
    } catch (err) {
      setPwErr(errText(err, t('common.error')));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="st">
      <header className="st-top">
        <button type="button" className="st-back" onClick={() => navigate('/profile')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          {t('settings.backToProfile')}
        </button>
        <h1 className="st-title">{t('settings.title')}</h1>
        <button type="button" className="st-logout" onClick={logout}>{t('settings.logout')}</button>
      </header>

      <div className="st-grid">
        {/* category rail */}
        <nav className="st-nav">
          {SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`st-nav__item ${active === s ? 'is-active' : ''}`}
              onClick={() => setActive(s)}
            >
              <span className="st-nav__icon" aria-hidden="true">{SECTION_ICONS[s]}</span>
              {t(`settings.sections.${s}`)}
            </button>
          ))}
        </nav>

        {/* active section */}
        <section className="st-panel">
          <div className="st-panel__head">
            <h2>{t(`settings.sections.${active}`)}</h2>
            <p>{t(`settings.${active}.sub`)}</p>
          </div>

          {/* ACCOUNT */}
          {active === 'account' && (
            <div className="st-form">
              <label className="st-field">
                <span>{t('settings.account.name')}</span>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </label>
              <label className="st-field">
                <span>{t('settings.account.username')}</span>
                <div className={`st-prefix ${usernameState === 'taken' ? 'is-taken' : ''} ${usernameState === 'free' ? 'is-free' : ''}`}>
                  <i>@</i>
                  <input
                    value={draft.username}
                    onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
                    aria-invalid={usernameState === 'taken'}
                  />
                </div>
                {usernameState !== 'idle' && (
                  <span className={`st-note st-note--${usernameState === 'free' ? 'ok' : 'bad'}`}>
                    {t(usernameState === 'free' ? 'auth.signup.usernameFree' : 'auth.signup.usernameTaken')}
                  </span>
                )}
              </label>
              <label className="st-field">
                <span>{t('settings.account.email')}</span>
                <input
                  type="email"
                  className={emailState === 'taken' ? 'is-taken' : emailState === 'free' ? 'is-free' : ''}
                  value={draft.email}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                  aria-invalid={emailState === 'taken'}
                />
                {emailState !== 'idle' && (
                  <span className={`st-note st-note--${emailState === 'free' ? 'ok' : 'bad'}`}>
                    {t(emailState === 'free' ? 'auth.signup.emailFree' : 'auth.signup.emailTaken')}
                  </span>
                )}
              </label>
              <label className="st-field">
                <span>{t('settings.account.bio')}</span>
                <textarea
                  rows={3}
                  value={draft.bio}
                  onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                />
              </label>
              <div className="st-actions">
                <button type="button" className="st-save" onClick={saveAccount} disabled={savingAccount || accountBlocked}>
                  {savingAccount ? t('common.saving') : t('settings.account.save')}
                </button>
              </div>
            </div>
          )}

          {/* ALLERGIES */}
          {active === 'allergies' && (
            <div className="st-rows">
              <div className="st-sub">{t('settings.allergies.title')}</div>
              <div className="st-allergens">
                {catalog.map((a) => {
                  const on = picked.includes(a.id);
                  return (
                    <button
                      type="button"
                      key={a.id}
                      className={`st-allergen ${on ? 'is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggleAllergy(a.id)}
                    >
                      <span aria-hidden="true">{a.emoji}</span>
                      {a.label}
                    </button>
                  );
                })}
              </div>

              <p className="st-allergens__note">
                {picked.length === 0
                  ? t('settings.allergies.none')
                  : t('settings.allergies.selected', { count: picked.length })}
              </p>
              <p className="st-row__hint">{t('settings.allergies.hint')}</p>

              <div className="st-actions st-actions--start">
                {picked.length > 0 && (
                  <button type="button" className="st-ghost" onClick={() => setPicked([])}>
                    {t('settings.allergies.clear')}
                  </button>
                )}
                <button
                  type="button"
                  className="st-save"
                  onClick={saveAllergies}
                  disabled={savingAllergies}
                >
                  {savingAllergies ? t('common.saving') : t('settings.allergies.save')}
                </button>
                <button
                  type="button"
                  className="st-ghost"
                  onClick={confirmNoAllergies}
                  disabled={savingAllergies}
                >
                  {t('settings.allergies.noAllergies')}
                </button>
              </div>
            </div>
          )}

          {/* PRIVACY */}
          {active === 'privacy' && (
            <div className="st-rows">
              <Row label={t('settings.privacy.private')} hint={t('settings.privacy.privateHint')}>
                <Switch on={settings.privateAccount} label={t('settings.privacy.private')}
                  onChange={(v) => setPref({ privateAccount: v })} />
              </Row>
              <Row label={t('settings.privacy.activity')} hint={t('settings.privacy.activityHint')}>
                <Switch on={settings.activityStatus} label={t('settings.privacy.activity')}
                  onChange={(v) => setPref({ activityStatus: v })} />
              </Row>
              <Row label={t('settings.privacy.tagging')} hint={t('settings.privacy.taggingHint')}>
                <Switch on={settings.allowTagging} label={t('settings.privacy.tagging')}
                  onChange={(v) => setPref({ allowTagging: v })} />
              </Row>
              <Row label={t('settings.privacy.passport')} hint={t('settings.privacy.passportHint')}>
                <Switch on={settings.publicPassport} label={t('settings.privacy.passport')}
                  onChange={(v) => setPref({ publicPassport: v })} />
              </Row>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {active === 'notifications' && (
            <div className="st-rows">
              {['followers', 'comments', 'forum', 'digest', 'daily'].map((k) => (
                <Row key={k} label={t(`settings.notifications.${k}`)}>
                  <Switch
                    on={settings.notif[k]}
                    label={t(`settings.notifications.${k}`)}
                    onChange={(v) => setNotif(k, v)}
                  />
                </Row>
              ))}
            </div>
          )}

          {/* APPEARANCE */}
          {active === 'appearance' && (
            <div className="st-rows">
              <Row label={t('settings.appearance.theme')}>
                <div className="st-seg">
                  {['system', 'light', 'dark'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={settings.theme === opt ? 'is-active' : ''}
                      onClick={() => setTheme(opt)}
                    >
                      {t(`settings.appearance.${opt}`)}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label={t('settings.appearance.language')}>
                <div className="st-seg">
                  {['en', 'ro'].map((lng) => (
                    <button
                      key={lng}
                      type="button"
                      className={i18n.language?.startsWith(lng) ? 'is-active' : ''}
                      onClick={() => setLanguage(lng)}
                    >
                      {t(`lang.${lng}`)}
                    </button>
                  ))}
                </div>
              </Row>
            </div>
          )}

          {/* SECURITY */}
          {active === 'security' && (
            <div className="st-rows">
              <Row label={t('settings.security.twoFactor')} hint={t('settings.security.twoFactorHint')}>
                <Switch
                  on={settings.twoFactor}
                  label={t('settings.security.twoFactor')}
                  onChange={(v) => {
                    setPref({ twoFactor: v });
                    flash(v ? t('settings.security.twoFactorOn') : t('settings.security.twoFactorOff'));
                  }}
                />
              </Row>

              <div className="st-sub">{t('settings.security.sessions')}</div>
              <ul className="st-sessions">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <span className="st-session__dot" data-current={s.current} aria-hidden="true" />
                    <span className="st-session__meta">
                      <b>{s.device}</b>
                      <small>{s.where}</small>
                    </span>
                    {!s.current && (
                      <button
                        type="button"
                        className="st-linkbtn"
                        onClick={() => {
                          setSessions((list) => list.filter((x) => x.id !== s.id));
                          flash(t('settings.security.sessionEnded'));
                        }}
                      >
                        {t('settings.security.logoutSession')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              <div className="st-actions st-actions--start">
                <button
                  type="button"
                  className="st-ghost"
                  onClick={openPassword}
                >
                  {t('settings.security.changePassword')}
                </button>
              </div>
            </div>
          )}

          {/* BLOCKED */}
          {active === 'blocked' && (
            <div className="st-rows">
              {blocked.length === 0 ? (
                <p className="st-empty">{t('settings.blocked.empty')}</p>
              ) : (
                <ul className="st-blocked">
                  {blocked.map((u) => (
                    <li key={u.id}>
                      <span className="st-blocked__avatar" aria-hidden="true">
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt="" />
                          : (u.full_name || u.username || '?').slice(0, 1).toUpperCase()}
                      </span>
                      <b>@{u.username}</b>
                      <button
                        type="button"
                        className="st-linkbtn"
                        onClick={() => unblock(u)}
                      >
                        {t('settings.blocked.unblock')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ===== CHANGE PASSWORD MODAL ===== */}
      <Modal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title={t('settings.security.changePassword')}
        footer={
          <>
            <button type="button" className="kbtn kbtn--ghost" onClick={() => setPwOpen(false)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="kbtn kbtn--primary" onClick={submitPassword} disabled={pwSaving}>
              {pwSaving ? t('common.saving') : t('settings.security.updatePassword')}
            </button>
          </>
        }
      >
        <div className="kfield">
          <label htmlFor="pw-current">{t('settings.security.currentPassword')}</label>
          <input
            id="pw-current"
            type="password"
            className="kinput"
            value={pw.current}
            onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
          />
        </div>
        <div className="kfield">
          <label htmlFor="pw-next">{t('settings.security.newPassword')}</label>
          <input
            id="pw-next"
            type="password"
            className="kinput"
            value={pw.next}
            onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
          />
        </div>
        <div className="kfield">
          <label htmlFor="pw-confirm">{t('settings.security.confirmPassword')}</label>
          <input
            id="pw-confirm"
            type="password"
            className="kinput"
            value={pw.confirm}
            onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
          />
        </div>
        {pwErr && <p className="st-pw-err">{pwErr}</p>}
      </Modal>

      <Toast message={toast} />
    </div>
  );
}

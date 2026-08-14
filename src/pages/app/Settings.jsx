import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings, applyTheme, settingsBlob } from '../../settings';
import { refreshUser, logout as logoutUser } from '../../user';
import { updateProfile, changePassword } from '../../services/users';
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

const SECTIONS = ['account', 'privacy', 'notifications', 'appearance', 'security', 'blocked'];

const SECTION_ICONS = {
  account: '👤',
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
const SEED_BLOCKED = ['spam_chef_99', 'burnt_toast_bot', 'mlm_recipes'];

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

  const [active, setActive] = useState('account');
  const [toast, setToast] = useState('');
  const [sessions, setSessions] = useState(SEED_SESSIONS);
  const [blocked, setBlocked] = useState(SEED_BLOCKED);
  const [savingAccount, setSavingAccount] = useState(false);

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

  // pull the live account from the backend on mount so the form + toggles
  // reflect the real user; hydrateFromUser() (inside refreshUser) updates the
  // shared store, which flows back here through useSettings().
  useEffect(() => {
    refreshUser();
  }, []);

  const flash = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  };

  const errText = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    return typeof detail === 'string' ? detail : fallback;
  };

  const logout = () => {
    logoutUser();
    navigate('/login');
  };

  const saveAccount = async () => {
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
                <div className="st-prefix">
                  <i>@</i>
                  <input
                    value={draft.username}
                    onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
                  />
                </div>
              </label>
              <label className="st-field">
                <span>{t('settings.account.email')}</span>
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                />
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
                <button type="button" className="st-save" onClick={saveAccount} disabled={savingAccount}>
                  {savingAccount ? t('common.saving') : t('settings.account.save')}
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
              <Row label={t('settings.privacy.messages')}>
                <div className="st-seg">
                  {['everyone', 'followers', 'none'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={settings.messagesFrom === opt ? 'is-active' : ''}
                      onClick={() => setPref({ messagesFrom: opt })}
                    >
                      {t(`settings.privacy.${opt}`)}
                    </button>
                  ))}
                </div>
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
                  {blocked.map((name) => (
                    <li key={name}>
                      <span className="st-blocked__avatar" aria-hidden="true">
                        {name.slice(0, 1).toUpperCase()}
                      </span>
                      <b>@{name}</b>
                      <button
                        type="button"
                        className="st-linkbtn"
                        onClick={() => {
                          setBlocked((list) => list.filter((n) => n !== name));
                          flash(t('settings.blocked.unblocked', { name }));
                        }}
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

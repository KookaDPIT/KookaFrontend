import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings, applyTheme } from '../../settings';
import Toast from '../../components/Toast';
import './Settings.css';

/* ==========================================================================
   SETTINGS — social-media-style settings screen. Category rail on the left,
   the active section's controls on the right. Everything is wired to the
   shared settings store (localStorage) so the profile reflects changes.
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

/* seed mock data — a backend would supply these */
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

  // account draft — committed on Save
  const [draft, setDraft] = useState({
    name: settings.name,
    username: settings.username,
    email: settings.email,
    bio: settings.bio,
  });

  const flash = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  };

  const logout = () => {
    localStorage.removeItem('kooka_token');
    localStorage.removeItem('kooka_user');
    navigate('/login');
  };

  const saveAccount = () => {
    update({
      name: draft.name.trim() || settings.name,
      username: draft.username.trim().replace(/^@/, '') || settings.username,
      email: draft.email.trim(),
      bio: draft.bio,
    });
    flash(t('settings.account.saved'));
  };

  const setTheme = (theme) => {
    update({ theme });
    applyTheme(theme);
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
                <button type="button" className="st-save" onClick={saveAccount}>
                  {t('settings.account.save')}
                </button>
              </div>
            </div>
          )}

          {/* PRIVACY */}
          {active === 'privacy' && (
            <div className="st-rows">
              <Row label={t('settings.privacy.private')} hint={t('settings.privacy.privateHint')}>
                <Switch on={settings.privateAccount} label={t('settings.privacy.private')}
                  onChange={(v) => update({ privateAccount: v })} />
              </Row>
              <Row label={t('settings.privacy.activity')} hint={t('settings.privacy.activityHint')}>
                <Switch on={settings.activityStatus} label={t('settings.privacy.activity')}
                  onChange={(v) => update({ activityStatus: v })} />
              </Row>
              <Row label={t('settings.privacy.tagging')} hint={t('settings.privacy.taggingHint')}>
                <Switch on={settings.allowTagging} label={t('settings.privacy.tagging')}
                  onChange={(v) => update({ allowTagging: v })} />
              </Row>
              <Row label={t('settings.privacy.passport')} hint={t('settings.privacy.passportHint')}>
                <Switch on={settings.publicPassport} label={t('settings.privacy.passport')}
                  onChange={(v) => update({ publicPassport: v })} />
              </Row>
              <Row label={t('settings.privacy.messages')}>
                <div className="st-seg">
                  {['everyone', 'followers', 'none'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={settings.messagesFrom === opt ? 'is-active' : ''}
                      onClick={() => update({ messagesFrom: opt })}
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
                    onChange={(v) => update((s) => ({ ...s, notif: { ...s.notif, [k]: v } }))}
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
                      onClick={() => i18n.changeLanguage(lng)}
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
                    update({ twoFactor: v });
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
                  onClick={() => flash(t('settings.security.passwordSent'))}
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

      <Toast message={toast} />
    </div>
  );
}

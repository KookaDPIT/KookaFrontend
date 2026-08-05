import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings, applyTheme } from '../../settings';
import kookaIcon from '../../assets/kooka-icon.png';
import './AppLayout.css';

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  ),
  learn: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 5.5v15A2.5 2.5 0 0 0 6.5 23H20" />
    </svg>
  ),
  forum: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 11a5 5 0 0 1-5 5H8l-4 3V8a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5z" />
      <path d="M20 8.5A4.5 4.5 0 0 1 21 11v9l-3-2" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  ),
};

const NAV = [
  { to: '/home', key: 'home', icon: ICONS.home },
  { to: '/chat', key: 'chat', icon: ICONS.chat },
  { to: '/learn', key: 'learn', icon: ICONS.learn },
  { to: '/forum', key: 'forum', icon: ICONS.forum },
  { to: '/profile', key: 'profile', icon: ICONS.profile },
];

export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const [settings] = useSettings();
  const other = i18n.language?.startsWith('ro') ? 'en' : 'ro';

  // apply the saved theme whenever it changes (and on first mount)
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  return (
    <div className="app-shell">
      <aside className="app-nav">
        <div className="app-nav__brand">
          <img src={kookaIcon} alt="" />
          <span>KOOKA</span>
        </div>

        <nav className="app-nav__links">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className="app-nav__link">
              <span className="app-nav__icon">{item.icon}</span>
              <span className="app-nav__label">{t(`nav.${item.key}`)}</span>
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="app-nav__lang"
          onClick={() => i18n.changeLanguage(other)}
          title={t('lang.switch')}
          aria-label={t('lang.switch')}
        >
          {t(`lang.${other}`)}
        </button>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

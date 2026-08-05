import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import kookaSymbol from '../../assets/kooka-icon.png';
import kookaSymbolWhite from '../../assets/kooka-icon-white.png';
import heroImage from '../../assets/hero-cooking.jpg';
import './Auth.css';

/**
 * Shared split-screen shell for the auth pages:
 *  - left: full-height branded hero (hidden on mobile)
 *  - right: white panel with the Autentificare / Cont nou switcher + form
 *
 * @param {'login'|'signup'} active  which tab is selected
 * @param {string} title             big heading above the form
 * @param {string} subtitle          muted line under the heading
 * @param {React.ReactNode} children the form itself
 */
export default function AuthLayout({ active, title, subtitle, children }) {
  const { t, i18n } = useTranslation();
  const other = i18n.language?.startsWith('ro') ? 'en' : 'ro';

  return (
    <div className={`auth-page auth-page--${active}`}>
      {/* Left — hero */}
      <aside
        className="auth-hero"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="auth-hero__brand">
          <img src={kookaSymbolWhite} alt="" className="auth-hero__logo" />
          <span>KOOKA</span>
        </div>

        <div className="auth-hero__content">
          <h2 className="auth-hero__title">
            <span>{t('auth.heroTitle')}</span>
            <span className="accent">{t('auth.heroAccent')}</span>
          </h2>
          <p className="auth-hero__text">{t('auth.heroText')}</p>
        </div>
      </aside>

      {/* Right — form panel */}
      <main className="auth-panel">
        <div className="auth-panel__inner">
          <div className="auth-brand-mobile">
            <img src={kookaSymbol} alt="" />
            <span>KOOKA</span>
          </div>

          <div className="auth-switchrow">
            <nav className="auth-toggle">
              <Link
                to="/login"
                className={active === 'login' ? 'is-active' : ''}
              >
                {t('auth.tabLogin')}
              </Link>
              <Link
                to="/signup"
                className={active === 'signup' ? 'is-active' : ''}
              >
                {t('auth.tabSignup')}
              </Link>
            </nav>
            <button
              type="button"
              className="auth-lang"
              onClick={() => i18n.changeLanguage(other)}
              title={t('lang.switch')}
            >
              {t(`lang.${other}`)}
            </button>
          </div>

          <div className="auth-head">
            <h1 className="auth-heading">{title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}

import { Link } from 'react-router-dom';
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
            <span>Gătitul se învață.</span>
            <span className="accent">O rețetă pe rând.</span>
          </h2>
          <p className="auth-hero__text">
            Lecții scurte, rețete potrivite nivelului tău și o comunitate
            care gătește împreună cu tine.
          </p>
        </div>
      </aside>

      {/* Right — form panel */}
      <main className="auth-panel">
        <div className="auth-panel__inner">
          <div className="auth-brand-mobile">
            <img src={kookaSymbol} alt="" />
            <span>KOOKA</span>
          </div>

          <nav className="auth-toggle">
            <Link
              to="/login"
              className={active === 'login' ? 'is-active' : ''}
            >
              Autentificare
            </Link>
            <Link
              to="/signup"
              className={active === 'signup' ? 'is-active' : ''}
            >
              Cont nou
            </Link>
          </nav>

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

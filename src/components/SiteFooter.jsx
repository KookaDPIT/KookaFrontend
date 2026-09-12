import { useTranslation } from 'react-i18next';
import './SiteFooter.css';

/* ==========================================================================
   SITE FOOTER — where Kooka lives outside the app.

   Rendered at the bottom of every scrolling screen (AppLayout skips it on the
   two that own their full height and never scroll: the chat thread and the
   cook-along). Deliberately quiet: it is the last thing on the page, not a
   second navigation.
   ========================================================================== */

const SOCIALS = [
  {
    key: 'facebook',
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61591800917369',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M14 8.5V7c0-.8.2-1.2 1.4-1.2H17V3h-2.6C11.6 3 10.6 4.4 10.6 6.8v1.7H9V11h1.6v10H14V11h2.3l.3-2.5H14z" />
      </svg>
    ),
  },
  {
    key: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/kooka.ro/',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export default function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="kfoot">
      <div className="kfoot__inner">
        <div className="kfoot__brand">
          <span className="kfoot__mark">KOOKA</span>
          <span className="kfoot__tag">{t('footer.tagline')}</span>
        </div>

        <nav className="kfoot__socials" aria-label={t('footer.followUs')}>
          <span className="kfoot__follow">{t('footer.followUs')}</span>
          {SOCIALS.map((s) => (
            <a
              key={s.key}
              className="kfoot__social"
              href={s.href}
              target="_blank"
              /* noopener keeps the new tab from getting a handle on ours */
              rel="noreferrer noopener"
              title={s.label}
              aria-label={s.label}
            >
              {s.icon}
            </a>
          ))}
        </nav>

        <p className="kfoot__legal">© {year} Kooka</p>
      </div>
    </footer>
  );
}

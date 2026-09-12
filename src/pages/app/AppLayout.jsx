import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings, applyTheme } from '../../settings';
import { useUser, refreshUser } from '../../user';
import { updateProfile } from '../../services/users';
import CookDock from '../../components/CookDock';
import SiteFooter from '../../components/SiteFooter';
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
  mealPlan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3v7M3.5 3v4a2.5 2.5 0 0 0 5 0V3M6 9.5V21" />
      <path d="M15 3v18M15 3c3.2 0 5 2.1 5 5s-1.8 5-5 5" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7.5 3v5.6c0 4.6-3.1 8.8-7.5 10-4.4-1.2-7.5-5.4-7.5-10V6z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </svg>
  ),
  theme: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 13.4A8.5 8.5 0 1 1 10.6 3.5a6.8 6.8 0 0 0 9.9 9.9z" />
    </svg>
  ),
  language: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9h17M3.5 15h17" />
      <path d="M12 3c2.4 2.4 3.6 5.4 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.4-3.6-9S9.6 5.4 12 3z" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
    </svg>
  ),
};

/* The footer would fight with the two screens that own their full height and
   never scroll — the chat thread and the cook-along. */
const FOOTERLESS = [/^\/chat$/, /^\/recipe\/\d+\/cook$/];

/* The narrowest a bottom-bar tab can be with its label still readable rather
   than ellipsised.

   A constant rather than a measurement on purpose: the widest label depends on
   which entries are currently shown, so measuring it would feed the decision
   back into its own input and oscillate. This is the widest destination label
   at the phone size — "Plan mese" at ~52px — plus the item's 4px of side
   padding. "More" is not in that reckoning because on a phone it renders as
   the ⋯ glyph alone (see the CSS); it is the longest label of the lot, and
   letting it set the floor cost a whole destination its place in the bar. */
const MIN_TAB_PX = 56;

/* How many nav entries fit before anything has to collapse.

   Measured, not assumed: the rail is a vertical column on a laptop and a
   horizontal bar on a phone, and both run out of room at different points —
   a short laptop window, a narrow phone, a staff account with one entry more
   than everyone else. The observer means it re-decides on every resize and on
   the flip between the two layouts.

   Reported as a count of slots; the caller decides whether one of them has to
   go to the "More" button. */
function useNavCapacity(listRef, fallback) {
  const [capacity, setCapacity] = useState(fallback);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return undefined;

    const measure = () => {
      const style = getComputedStyle(el);
      const gap = parseFloat(style.gap) || 0;
      let fits;
      if (style.flexDirection === 'row') {
        fits = Math.floor((el.clientWidth + gap) / (MIN_TAB_PX + gap));
      } else {
        // every entry is the same height, so one of them is the unit
        const unit = el.querySelector('.app-nav__link')?.getBoundingClientRect().height;
        fits = unit ? Math.floor((el.clientHeight + gap) / (unit + gap)) : fallback;
      }
      // two is the floor: a rail with one entry is not navigation
      setCapacity(Math.max(2, fits));
    };

    /* Three triggers, because no single one is reliable on its own:

       - a scheduled first measurement, which is what actually sets the opening
         value. Deliberately not called straight from the effect body (that is
         a synchronous setState and a cascading render), and deliberately not
         rAF: neither rAF nor ResizeObserver callbacks are delivered while the
         tab is in the background, and a rail that only lays itself out once
         you look at it is a rail that is wrong on first paint.
       - the observer, which catches the rail changing size without the window
         doing so — the flip between the vertical rail and the bottom bar, or
         a staff account loading and adding an entry.
       - window resize, as the plain case, and the one that keeps working when
         ResizeObserver is unavailable. */
    const initial = window.setTimeout(measure, 0);
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(el);
    window.addEventListener('resize', measure);

    return () => {
      window.clearTimeout(initial);
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [listRef, fallback]);

  return capacity;
}

/* `owns` widens which routes light a rail item up. Recipes, search and the
   recipe editor have no rail entry of their own — they are places you reach
   *from* the feed — so opening someone's recipe should keep saying "you are in
   Home", not blank the whole rail. */
const NAV = [
  {
    to: '/home',
    key: 'home',
    icon: ICONS.home,
    owns: (path) => ['/home', '/recipe', '/search', '/create'].some(
      (p) => path === p || path.startsWith(`${p}/`),
    ),
  },
  { to: '/chat', key: 'chat', icon: ICONS.chat },
  { to: '/learn', key: 'learn', icon: ICONS.learn },
  { to: '/forum', key: 'forum', icon: ICONS.forum },
  { to: '/profile', key: 'profile', icon: ICONS.profile },
  /* Ordered by how often you go there, because that is now what decides what
     collapses: the list is cut from the end, so the planner is the first to
     move behind "More", and the moderation console — appended only for staff —
     goes with it. */
  { to: '/meal-plan', key: 'mealPlan', icon: ICONS.mealPlan },
];

const ADMIN_ITEM = { to: '/admin', key: 'admin', icon: ICONS.admin };

export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const [settings, updateSettings] = useSettings();
  const [me] = useUser();
  const { pathname } = useLocation();

  /* The cached user can be stale — someone suspended two minutes ago still has
     a clean copy in localStorage. Re-ask on mount, and again whenever the tab
     comes back to the foreground: this component stays mounted across in-app
     navigation, so without the second check a sanction handed down mid-session
     would not land until a full reload. */
  useEffect(() => {
    refreshUser();
    // `focus` gets its own handler on purpose: gating it on visibilityState
    // would swallow it whenever the document is not considered visible, which
    // is exactly when the tab is being brought back.
    const onFocus = () => refreshUser();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshUser();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, []);
  // the moderation link only exists for staff; the route and every /admin
  // endpoint check the role again, so this is presentation, not access control
  const isStaff = me?.role === 'admin' || me?.role === 'moderator';
  const other = i18n.language?.startsWith('ro') ? 'en' : 'ro';

  // apply the saved theme whenever it changes (and on first mount)
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  /* Exactly what the Settings screen does, for exactly the same reason as the
     theme switch below: change it here, remember it locally, and tell the
     account. Without the last step the next GET /me — which runs on mount and
     whenever the tab regains focus — pushed the account's stored language back
     over the choice. Opening your profile calls refreshUser() on mount, so
     picking English and then tapping Profil put the whole app back into
     Romanian, which is where a fresh account starts. */
  const switchLanguage = () => {
    i18n.changeLanguage(other);
    updateSettings({ language: other });
    updateProfile({ language: other }).catch(() => {
      /* offline: the choice still holds for this session and the account
         catches up the next time it saves */
    });
  };

  const toggleTheme = () => {
    // system/light → dark, dark → light
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: newTheme });
    /* ...and tell the account, the way the Settings screen does. Without this
       the switch only ever changed the local store, and the next GET /me —
       which runs on mount and every time the tab regains focus — pushed the
       saved `light` straight back over it. The toggle looked broken because it
       was: dark lasted until you changed tabs. */
    updateProfile({ theme: newTheme }).catch(() => {
      /* offline: the local store still flipped, so the app follows the choice
         for this session and the account catches up next time */
    });
  };

  /* ---- what fits, and what has to collapse -------------------------------
     "More" is not a fixed shelf any more: it appears only when the rail cannot
     hold everything, and it holds exactly what did not fit. On a tall laptop
     window every entry is simply in the rail and there is no "More" button at
     all — which is the point, since a menu behind a menu is worth having only
     when the alternative is a row you cannot read. */
  const listRef = useRef(null);

  /* Only destinations are measured. The two switches are not places you go, so
     they are not in the running for a slot in the rail — they live in the
     drawer, under their own heading, and they stay there at every size. That
     also settles the circularity an earlier arrangement had, where the
     switches moved between the rail and the drawer: the thing being measured
     no longer depends on the outcome of the measurement. */
  const items = isStaff ? [...NAV, ADMIN_ITEM] : NAV;
  const capacity = useNavCapacity(listRef, items.length);

  /* Controls, kept apart from the destinations above them in the panel. The
     second line is the current value rather than a description — what you want
     to know before tapping is what it is set to now. */
  const controls = [
    {
      key: 'theme',
      icon: ICONS.theme,
      action: toggleTheme,
      detail: t(settings.theme === 'dark' ? 'theme.dark' : 'theme.light'),
    },
    {
      key: 'language',
      icon: ICONS.language,
      action: switchLanguage,
      detail: t(`lang.${i18n.language?.startsWith('ro') ? 'roName' : 'enName'}`),
    },
  ];

  /* The button is always in the rail — it always has the two switches in it —
     so it always takes one of the slots, and the destinations share the rest.
     Nothing is hidden that would have fitted: `hidden` is empty whenever every
     destination has a place. */
  const slots = Math.max(1, capacity - 1);
  const shown = items.slice(0, slots);
  const hidden = items.slice(slots);

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const panelRef = useRef(null);

  // close it on an outside click or Escape — a drawer you cannot dismiss by
  // tapping the page reads as a stuck overlay
  useEffect(() => {
    if (!moreOpen) return undefined;
    const onDown = (e) => {
      // the panel is portalled to <body>, so it is not inside `moreRef`
      const inButton = moreRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      if (!inButton && !inPanel) setMoreOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setMoreOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  // ...and whenever it takes you somewhere. Tracked against the path we were
  // open on, so this is a render-time correction rather than a second pass.
  const [openedAt, setOpenedAt] = useState(pathname);
  if (moreOpen && openedAt !== pathname) setMoreOpen(false);
  if (!moreOpen && openedAt !== pathname) setOpenedAt(pathname);

  const moreActive = hidden.some((item) => item.to && pathname.startsWith(item.to));
  const showFooter = !FOOTERLESS.some((re) => re.test(pathname));

  // a suspended account gets the wall instead of the app, from any route
  if (me?.suspended) return <Navigate to="/suspended" replace />;

  return (
    <div className="app-shell">
      <aside className="app-nav">
        <div className="app-nav__brand">
          <img src={kookaIcon} alt="" />
          <span>KOOKA</span>
        </div>

        <nav className="app-nav__links" ref={listRef}>
          {shown.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) =>
                `app-nav__link${isActive || item.owns?.(pathname) ? ' active' : ''}`
              }
            >
              <span className="app-nav__icon">{item.icon}</span>
              <span className="app-nav__label">{t(`nav.${item.key}`)}</span>
            </NavLink>
          ))}

          <div className="app-more" ref={moreRef}>
              <button
                type="button"
                className={`app-nav__link app-nav__link--more${moreActive ? ' active' : ''}`}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                /* the label is hidden on phones, so name the button itself */
                aria-label={t('nav.more')}
                title={t('nav.more')}
                onClick={() => setMoreOpen((v) => !v)}
              >
                <span className="app-nav__icon">{ICONS.more}</span>
                <span className="app-nav__label">{t('nav.more')}</span>
              </button>

              {/* Portalled to <body>. The rail is `position: sticky`, which makes
                  it its own stacking context, and pages like Home put their sheet
                  on `z-index: 2` — so a panel rendered inside the rail was painted
                  underneath the page however high its own z-index went. */}
              {moreOpen && createPortal(
                <div className="app-more__panel" role="menu" ref={panelRef}>
                  {/* Destinations that did not fit in the rail — nothing at all
                      when every one of them had a place. */}
                  {hidden.length > 0 && (
                    <div className="app-more__group">
                      {hidden.map((item) => (
                        <NavLink
                          key={item.key}
                          to={item.to}
                          className="app-more__item"
                          role="menuitem"
                        >
                          <span className="app-more__icon">{item.icon}</span>
                          <span>
                            <b>{t(`nav.${item.key}`)}</b>
                            <small>{t(`nav.${item.key}Hint`)}</small>
                          </span>
                        </NavLink>
                      ))}
                    </div>
                  )}

                  {/* The switches, kept apart from the places above: they are
                      settings, and tapping one changes something here rather
                      than taking you somewhere. The drawer deliberately stays
                      open so you see the change land. */}
                  <div className="app-more__group app-more__group--controls">
                    {controls.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className="app-more__item"
                        role="menuitem"
                        onClick={item.action}
                      >
                        <span className="app-more__icon">{item.icon}</span>
                        <span>
                          <b>{t(`nav.${item.key}`)}</b>
                          <small>{item.detail}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>,
                document.body,
              )}
          </div>
        </nav>

      </aside>

      <main className="app-main">
        <Outlet />
        {showFooter && <SiteFooter />}
      </main>

      {/* the pan you left on the stove — hidden on the cook-along itself */}
      <CookDock />
    </div>
  );
}

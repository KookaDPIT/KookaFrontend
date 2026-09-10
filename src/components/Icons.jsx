import './Icons.css';

/* ==========================================================================
   Shared icons + the Kooka brand mark used as the AI avatar.
   The old "K" letter is replaced by a chef-hat mark; the "ask AI" action uses
   a sparkle icon (the common AI motif).
   ========================================================================== */

/* Kooka AI identity — a chef's toque */
export function KookaMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="7.6" cy="10.4" r="3.7" />
      <circle cx="16.4" cy="10.4" r="3.7" />
      <circle cx="12" cy="8.4" r="4.3" />
      <rect x="7" y="10" width="10" height="6" rx="1" />
      <path d="M7.4 15.4h9.2v3.9a1.2 1.2 0 0 1-1.2 1.2H8.6a1.2 1.2 0 0 1-1.2-1.2z" />
      <path d="M9.6 16.8v2.4M12 16.8v2.4M14.4 16.8v2.4" stroke="#ff6b35"
        strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  );
}

/* Rounded-badge avatar wrapping the mark */
export function KookaAvatar({ size = 'md', className = '' }) {
  return (
    <span className={`kooka-avatar kooka-avatar--${size} ${className}`}>
      <KookaMark className="kooka-avatar__mark" />
    </span>
  );
}

/* AI action — sparkles */
export function IconSparkle({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l1.7 4.4a3 3 0 0 0 1.8 1.8L20 10.4l-4.5 1.7a3 3 0 0 0-1.8 1.8L12 18.3l-1.7-4.4a3 3 0 0 0-1.8-1.8L4 10.4l4.5-1.7a3 3 0 0 0 1.8-1.8z" />
      <path d="M18.5 14.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" />
    </svg>
  );
}

export function IconSend({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20V6M6 12l6-6 6 6" />
    </svg>
  );
}

export function IconMic({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export function IconCamera({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export function IconPlus({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/* sidebar collapse / open toggle */
export function IconSidebar({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  );
}

export function IconBack({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/* a house — the way out of a cook-along that is not "finish or lose it" */
export function IconHome({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function IconClock({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/* ---- Ask-Kooka task icons -------------------------------------------------
   One per thing Kooka can do. They carry the meaning on the welcome cards, so
   people can tell the options apart without reading every line. */

/* a pot on the hob — "what can I cook?" */
export function IconPot({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9z" />
      <path d="M2 9h20M7 9V6.5M12 9V5.5M17 9V6.5" />
    </svg>
  );
}

/* two arrows swapping — "I'm out of an ingredient" */
export function IconSwap({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </svg>
  );
}

/* a calendar — "plan my week" */
export function IconCalendar({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

/* a kitchen scale — "how much did I eat?" */
export function IconScale({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="18" height="14" rx="3" />
      <path d="M8 7V5a4 4 0 0 1 8 0v2" />
      <path d="M9 14h6" />
    </svg>
  );
}

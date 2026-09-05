import { RANK_COLORS } from '../lib/ranks';
import './RankBadge.css';

/* ==========================================================================
   RankBadge — a chef's toque inside a coloured ring, drawn as inline SVG.

   Everything is generated from the rank's colour, so there are no image files
   to keep in sync and the badge stays crisp at any size. The Roman numeral is
   the division within the rank (Chef has only one, so it is omitted).
   ========================================================================== */

const ROMAN = ['I', 'II', 'III'];

export default function RankBadge({
  rank = 'copper',
  division = 0,      // 1-based; 0 or missing hides the numeral
  size = 72,
  muted = false,     // greyed out — for ranks not yet reached
  title,
}) {
  const colors = RANK_COLORS[rank] || RANK_COLORS.copper;
  const ring = muted ? colors.faded : colors.vibrant;
  const base = muted ? colors.faded : colors.shadow;
  const numeral = division >= 1 && division <= 3 ? ROMAN[division - 1] : '';
  const id = `rb-${rank}-${division}-${size}`;

  return (
    <span
      className={`rbadge ${muted ? 'is-muted' : ''}`}
      style={{ width: size, height: size }}
      title={title}
    >
      <svg viewBox="0 0 100 100" role="img" aria-label={title || rank}>
        <defs>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ring} />
            <stop offset="100%" stopColor={base} />
          </linearGradient>
        </defs>

        {/* Tinted disc behind the toque. Without it the white hat sits on a
            cream card and all but disappears — the ring alone read as empty. */}
        <circle cx="50" cy="48" r="30" fill={ring} opacity={muted ? 0.16 : 0.24} />

        {/* coloured ring */}
        <circle cx="50" cy="48" r="33" fill="none"
                stroke={`url(#${id}-ring)`} strokeWidth="9" />
        {/* dashed inner ring, echoing the stitched look of the reference badges */}
        <circle cx="50" cy="48" r="26" fill="none" stroke={base}
                strokeWidth="1.4" strokeDasharray="4 5" opacity=".5" />

        {/* the toque: three puffs over a band, outlined so it reads on any ground */}
        <g fill="#fff" stroke={base} strokeWidth="1.2" strokeLinejoin="round">
          <circle cx="36" cy="36" r="11" />
          <circle cx="50" cy="30" r="12.5" />
          <circle cx="64" cy="36" r="11" />
          <rect x="34" y="40" width="32" height="19" rx="4" />
          <rect x="36" y="57" width="28" height="8" rx="3.5" />
        </g>
        {/* redraw the band fill so the puff outlines do not cross it */}
        <rect x="35.2" y="41" width="29.6" height="16" fill="#fff" />

        {/* base plinth, in the rank colour */}
        <rect x="38" y="70" width="24" height="9" rx="4.5" fill={ring} />
        <rect x="38" y="70" width="24" height="4" rx="2" fill="#fff" opacity=".28" />

        {numeral && (
          <text x="50" y="55" textAnchor="middle"
                className="rbadge__numeral" fill={base}>
            {numeral}
          </text>
        )}
      </svg>
    </span>
  );
}

/* Compact inline pill — for recipe cards, challenge rows and lesson headers,
   where a full badge would dominate. */
export function RankPill({ rank = 'copper', label, locked = false }) {
  const colors = RANK_COLORS[rank] || RANK_COLORS.copper;
  return (
    <span
      className={`rpill ${locked ? 'is-locked' : ''}`}
      style={{ '--rpill-color': colors.vibrant, '--rpill-deep': colors.shadow }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="rpill__icon">
        <circle cx="8" cy="9" r="4" />
        <circle cx="16" cy="9" r="4" />
        <circle cx="12" cy="6.5" r="4.5" />
        <rect x="7" y="10" width="10" height="7" rx="1.6" />
        <rect x="7.8" y="17" width="8.4" height="3" rx="1.5" />
      </svg>
      {label || rank}
      {locked && <span className="rpill__lock" aria-hidden="true">🔒</span>}
    </span>
  );
}

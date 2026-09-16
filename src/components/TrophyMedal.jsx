import './TrophyMedal.css';

/* ==========================================================================
   TrophyMedal — a struck metal medal with the Kooka toque on its face.

   Drawn as inline SVG rather than shipped as five images: the only thing that
   changes between tiers is the metal, so one path set plus a gradient gives
   every tier for free, stays crisp at any size, and cannot go out of sync with
   the palette.

   States:
     earned   full metal, ribbon in the tier's colour
     locked   the same medal, drained of colour — you can see the shape of what
              you are missing, which is the point of a trophy list
     hidden   locked and blank: a dark blank with a question mark, because the
              name itself is the spoiler
   ========================================================================== */

/* Each metal is three stops: a highlight, the body, and the shadow that makes
   the rim read as a bevel rather than as a flat ring. */
const METALS = {
  bronze: { light: '#e0a877', mid: '#b8753d', dark: '#7c4a22', ribbon: '#8c5629' },
  silver: { light: '#eceae6', mid: '#b6b2ab', dark: '#7d7a74', ribbon: '#6b6863' },
  gold: { light: '#f4dc93', mid: '#c9a632', dark: '#8e7015', ribbon: '#9c7f1f' },
  platinum: { light: '#e8f4fa', mid: '#a9c9d8', dark: '#5f8296', ribbon: '#3b7d9b' },
  hidden: { light: '#6b6259', mid: '#443d36', dark: '#241f1a', ribbon: '#2e2822' },
};

const LOCKED = { light: '#ded3bd', mid: '#c2b49a', dark: '#9c8f78', ribbon: '#b3a58c' };

export default function TrophyMedal({
  tier = 'bronze',
  earned = false,
  secret = false,   // hidden and not yet earned — show a blank face
  size = 68,
}) {
  const metal = earned ? METALS[tier] || METALS.bronze : secret ? METALS.hidden : LOCKED;
  const id = `tm-${tier}-${earned ? 'on' : secret ? 'secret' : 'off'}`;

  return (
    <span
      className={`tmedal ${earned ? 'is-earned' : 'is-locked'} ${secret ? 'is-secret' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100">
        <defs>
          <linearGradient id={`${id}-face`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor={metal.light} />
            <stop offset="45%" stopColor={metal.mid} />
            <stop offset="100%" stopColor={metal.dark} />
          </linearGradient>
          <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={metal.light} />
            <stop offset="100%" stopColor={metal.dark} />
          </linearGradient>
        </defs>

        {/* Ribbon: one solid band that flares into the disc.

            Two separate tails with a notch between them read as ears at the
            sizes this thing is actually used at — 24px in a section heading,
            38px in the profile rail. A single trapezoid with a fold down the
            middle keeps the ribbon legible when it is twelve pixels tall. */}
        <path d="M43 3 H57 L63 33 H37 Z" fill={metal.ribbon} />
        <path d="M50 3 V33" stroke={metal.dark} strokeWidth="1.2" opacity=".35" />

        {/* the disc: rim, face, and a notched edge so it reads as struck metal */}
        <circle cx="50" cy="61" r="33" fill={`url(#${id}-rim)`} />
        <circle cx="50" cy="61" r="27.5" fill={`url(#${id}-face)`} />
        <g stroke={metal.dark} strokeWidth="1.6" opacity=".45">
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={50 + Math.cos(a) * 29}
                y1={61 + Math.sin(a) * 29}
                x2={50 + Math.cos(a) * 32}
                y2={61 + Math.sin(a) * 32}
              />
            );
          })}
        </g>

        {secret && !earned ? (
          <text
            x="50" y="74" textAnchor="middle"
            className="tmedal__q" fill={metal.light}
          >
            ?
          </text>
        ) : (
          /* The Kooka toque, the same mark the rank badges carry, so a trophy
             reads as part of the same set. Centred on the disc, not on the
             viewBox — the ribbon pushes the disc down. */
          <g
            fill={metal.light}
            stroke={metal.dark}
            strokeWidth="1.4"
            strokeLinejoin="round"
            opacity={earned ? 1 : 0.85}
          >
            <circle cx="41" cy="57" r="8.5" />
            <circle cx="50" cy="51.5" r="9.5" />
            <circle cx="59" cy="57" r="8.5" />
            <rect x="39.5" y="58" width="21" height="13" rx="3.2" />
            <rect x="41.5" y="70" width="17" height="5.5" rx="2.6" />
          </g>
        )}
      </svg>
    </span>
  );
}

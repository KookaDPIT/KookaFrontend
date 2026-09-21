import './Flag.css';

/* ==========================================================================
   A country flag that looks the same everywhere.

   Flags used to be emoji built from the alpha-2 code (regional indicator
   pairs). That works on Android and on Apple devices and nowhere else:
   Windows has no flag glyphs at all, so it falls back to drawing the two
   letters — every recipe card and every passport stamp showed "IT" or "RO"
   where the rest of the world saw a flag. On the browsers most of our people
   actually use, the feature simply was not there.

   So the flags are SVG files now (`country-flag-icons`), served as images.
   The glob below is resolved at build time and yields nothing but a map of
   code -> asset URL — a couple of kilobytes of strings. The drawings
   themselves are separate files the browser fetches only for the flags a page
   actually shows, so having all ~250 available costs nothing up front.
   ========================================================================== */

const FILES = import.meta.glob(
  '../../node_modules/country-flag-icons/3x2/*.svg',
  { query: '?url', import: 'default', eager: true },
);

/* code (uppercase alpha-2) -> URL */
const BY_CODE = Object.fromEntries(
  Object.entries(FILES).map(([path, url]) => [
    path.slice(path.lastIndexOf('/') + 1, -4).toUpperCase(),
    url,
  ]),
);

/* `title` is what a hover and a screen reader get. Without one the flag is
   decoration next to a name that already says the country, which is the usual
   case — hence aria-hidden rather than an empty alt. */
export default function Flag({ code, title = '', className = '', size }) {
  const url = BY_CODE[String(code || '').toUpperCase()];

  /* An origin we have no drawing for (or no origin at all) keeps the plate:
     the layout expects something in that slot, and a gap reads as a bug. */
  if (!url) {
    return (
      <span className={`flag flag--none ${className}`} title={title || undefined}>
        🍽️
      </span>
    );
  }

  return (
    <img
      src={url}
      className={`flag ${className}`}
      style={size ? { width: size } : undefined}
      alt={title || ''}
      title={title || undefined}
      aria-hidden={title ? undefined : 'true'}
      loading="lazy"
      draggable="false"
    />
  );
}

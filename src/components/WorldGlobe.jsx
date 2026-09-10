import { useEffect, useMemo, useRef, useState } from 'react';
import { geoOrthographic, geoPath } from 'd3-geo';
import world from '../data/countries.geo.json';
import './WorldGlobe.css';

/* Rotating 3D globe built on d3-geo (React-19 safe — d3-geo is pure JS).

   `visited` is the passport: either plain ISO alpha-3 codes, or the API shape
   `[{ country, count }]`. When counts are there the stamp deepens with them,
   so a country you have cooked eight dishes from reads darker than one you
   visited once — the map becomes a record of how much, not just whether.

   Auto-rotates; drag to spin manually. */
const SIZE = 360;

/* The stamp ramp: the brand orange at one dish, a deep burnt version at the
   top of your own range. It stays recognisably orange at both ends — going
   all the way to brown would lose the colour that means "visited". */
const STAMP_LIGHT = [255, 138, 90];   // #ff8a5a
const STAMP_DEEP = [138, 44, 12];     // #8a2c0c

function stampColor(t) {
  const k = Math.max(0, Math.min(1, t));
  const mix = STAMP_LIGHT.map((c, i) => Math.round(c + (STAMP_DEEP[i] - c) * k));
  return `rgb(${mix.join(', ')})`;
}

/* Counts per country, keyed by ISO code. Accepts both shapes so callers that
   only have a list of codes keep working. */
function toCounts(visited) {
  const counts = new Map();
  for (const entry of visited || []) {
    if (typeof entry === 'string') {
      counts.set(entry, (counts.get(entry) || 0) + 1);
    } else if (entry?.country) {
      counts.set(entry.country, Math.max(1, Number(entry.count) || 1));
    }
  }
  return counts;
}

export default function WorldGlobe({ visited = [], size = SIZE }) {
  const counts = useMemo(() => toCounts(visited), [visited]);
  const [rotation, setRotation] = useState([0, -15]);
  const draggingRef = useRef(null);
  const rafRef = useRef(null);

  // auto-rotate unless the user is dragging
  useEffect(() => {
    let last = null;
    const tick = (ts) => {
      if (last == null) last = ts;
      const dt = ts - last;
      last = ts;
      if (!draggingRef.current) {
        setRotation(([l, p]) => [(l + dt * 0.012) % 360, p]);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* The ramp is scaled to this cook's own busiest country rather than to a
     fixed ceiling: with a global maximum, someone six dishes in would see six
     identical near-white stamps and no progress at all. Capped so the first
     few dishes still make a visible difference. */
  const peak = useMemo(() => {
    const max = Math.max(1, ...counts.values());
    return Math.min(max, 12);
  }, [counts]);

  const { spherePath, features } = useMemo(() => {
    const projection = geoOrthographic()
      .scale(size / 2 - 2)
      .translate([size / 2, size / 2])
      .rotate([rotation[0], rotation[1]]);
    const path = geoPath(projection);
    return {
      spherePath: path({ type: 'Sphere' }),
      // some geojson territories share id "-99" (no ISO code), so key by index.
      features: world.features.map((f, i) => {
        const count = counts.get(f.id) || 0;
        return {
          key: `${f.id}-${i}`,
          d: path(f),
          on: count > 0,
          // 1 dish sits at the light end; `peak` and above at the deep end
          fill: count > 0 ? stampColor(peak > 1 ? (count - 1) / (peak - 1) : 1) : null,
          count,
        };
      }),
    };
  }, [rotation, size, counts, peak]);

  // drag handlers
  const onDown = (e) => {
    draggingRef.current = { x: e.clientX, y: e.clientY, rot: rotation };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    const d = draggingRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    setRotation([d.rot[0] + dx * 0.5, Math.max(-90, Math.min(90, d.rot[1] - dy * 0.5))]);
  };
  const onUp = () => {
    draggingRef.current = null;
  };

  return (
    <svg
      className="wglobe"
      viewBox={`0 0 ${size} ${size}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
    >
      <circle className="wglobe__halo" cx={size / 2} cy={size / 2} r={size / 2 - 2} />
      <path className="wglobe__ocean" d={spherePath} />
      {features.map((f) => (
        <path
          key={f.key}
          className={`wglobe__land ${f.on ? 'is-on' : ''}`}
          d={f.d || ''}
          /* the depth is per-country data, so it belongs on the element
             rather than in a stylesheet that cannot know the counts */
          style={f.fill ? { fill: f.fill } : undefined}
        />
      ))}
    </svg>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoOrthographic, geoPath } from 'd3-geo';
import world from '../data/countries.geo.json';
import './WorldGlobe.css';

/* Rotating 3D globe built on d3-geo (React-19 safe — d3-geo is pure JS).
   `visited` is a Set/array of ISO alpha-3 codes to highlight.
   Auto-rotates; drag to spin manually. */
const SIZE = 360;

export default function WorldGlobe({ visited = [], size = SIZE }) {
  const visitedSet = useMemo(() => new Set(visited), [visited]);
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

  const { spherePath, features } = useMemo(() => {
    const projection = geoOrthographic()
      .scale(size / 2 - 2)
      .translate([size / 2, size / 2])
      .rotate([rotation[0], rotation[1]]);
    const path = geoPath(projection);
    return {
      spherePath: path({ type: 'Sphere' }),
      // some geojson territories share id "-99" (no ISO code), so key by index.
      features: world.features.map((f, i) => ({
        key: `${f.id}-${i}`,
        d: path(f),
        on: visitedSet.has(f.id),
      })),
    };
  }, [rotation, size, visitedSet]);

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
        <path key={f.key} className={`wglobe__land ${f.on ? 'is-on' : ''}`} d={f.d || ''} />
      ))}
    </svg>
  );
}

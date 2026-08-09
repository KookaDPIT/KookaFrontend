import { useEffect, useMemo, useRef, useState } from 'react';
import './CookTimer.css';

/* Parse "M:SS", "MM:SS" or "H:MM:SS" into total seconds. */
function parseTimer(str) {
  if (!str) return 0;
  const parts = String(str).split(':').map((n) => parseInt(n, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function fmt(total) {
  const s = Math.max(0, total);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/* Countdown timer for a cook step, with play/pause + reset.
   Mount with a key tied to the step so it resets when the step changes. */
export default function CookTimer({ timer, label }) {
  const total = useMemo(() => parseTimer(timer), [timer]);
  // Parent mounts this with key={stepIndex}, so a step change remounts the
  // component and re-seeds state from `total` — no reset effect needed.
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const tickRef = useRef(null);

  useEffect(() => {
    if (!running) return undefined;
    tickRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(tickRef.current);
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(tickRef.current);
  }, [running]);

  const done = remaining === 0;

  return (
    <div className={`ctimer ${done ? 'is-done' : ''} ${running ? 'is-running' : ''}`}>
      <div className="ctimer__readout">
        <b>{fmt(remaining)}</b>
        {label && <small>{label}</small>}
      </div>
      <div className="ctimer__controls">
        <button
          type="button"
          className="ctimer__btn"
          onClick={() => setRunning((v) => !v)}
          disabled={done}
          aria-label={running ? 'Pause' : 'Play'}
        >
          {running ? '⏸' : '▶'}
        </button>
        <button
          type="button"
          className="ctimer__btn ctimer__btn--reset"
          onClick={() => {
            setRunning(false);
            setRemaining(total);
          }}
          aria-label="Reset"
        >
          ↺
        </button>
      </div>
    </div>
  );
}

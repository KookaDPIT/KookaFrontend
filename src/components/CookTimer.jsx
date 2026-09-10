import { formatTimer, resetTimer, timerRemaining, toggleTimer, useCookSession } from '../cook';
import './CookTimer.css';

/* Countdown for the current cook step.

   The clock itself lives in the shared cook session (src/cook.js), not in this
   component: the same timer has to keep running while you browse the rest of
   the app and show up in the dock, so a component-local interval would be the
   wrong owner. This is only the face. */
export default function CookTimer({ compact = false }) {
  const session = useCookSession();
  const timer = session?.timer;
  if (!timer) return null;

  const remaining = timerRemaining(timer);
  const done = remaining === 0;

  return (
    <div className={`ctimer ${done ? 'is-done' : ''} ${timer.running ? 'is-running' : ''} ${compact ? 'ctimer--compact' : ''}`}>
      <div className="ctimer__readout">
        <b>{formatTimer(remaining)}</b>
        {timer.label && !compact && <small>{timer.label}</small>}
      </div>
      <div className="ctimer__controls">
        <button
          type="button"
          className="ctimer__btn"
          onClick={toggleTimer}
          disabled={done}
          aria-label={timer.running ? 'Pause' : 'Play'}
        >
          {timer.running ? '⏸' : '▶'}
        </button>
        <button
          type="button"
          className="ctimer__btn ctimer__btn--reset"
          onClick={resetTimer}
          aria-label="Reset"
        >
          ↺
        </button>
      </div>
    </div>
  );
}

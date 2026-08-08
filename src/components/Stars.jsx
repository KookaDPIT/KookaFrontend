import { useState } from 'react';
import './Stars.css';

/* Star rating. Read-only when no onChange is passed; interactive otherwise. */
export default function Stars({ value = 0, onChange, size = 20, count = 5 }) {
  const [hover, setHover] = useState(0);
  const interactive = typeof onChange === 'function';
  const shown = hover || value;

  return (
    <span className={`stars ${interactive ? 'stars--interactive' : ''}`} style={{ '--star-size': `${size}px` }}>
      {Array.from({ length: count }).map((_, i) => {
        const n = i + 1;
        const filled = n <= shown;
        return interactive ? (
          <button
            key={n}
            type="button"
            className={`stars__btn ${filled ? 'is-on' : ''}`}
            aria-label={`${n} / ${count}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
          >
            {filled ? '★' : '☆'}
          </button>
        ) : (
          <span key={n} className={`stars__ico ${filled ? 'is-on' : ''}`} aria-hidden="true">
            {filled ? '★' : '☆'}
          </span>
        );
      })}
    </span>
  );
}

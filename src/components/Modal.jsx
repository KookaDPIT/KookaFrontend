import { useEffect } from 'react';
import './Modal.css';

/* ==========================================================================
   Modal — lightweight overlay dialog. Closes on backdrop click or Escape.
   ========================================================================== */
export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="kmodal" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="kmodal__card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="kmodal__head">
          <h2 className="kmodal__title">{title}</h2>
          <button type="button" className="kmodal__x" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="kmodal__body">{children}</div>
        {footer && <div className="kmodal__foot">{footer}</div>}
      </div>
    </div>
  );
}

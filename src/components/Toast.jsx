import './Toast.css';

/* ==========================================================================
   Toast — transient status pill. Render always; pass a message to show it.
   The parent owns the message state and clears it on a timer.
   ========================================================================== */
export default function Toast({ message }) {
  return (
    <div className={`ktoast ${message ? 'is-shown' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

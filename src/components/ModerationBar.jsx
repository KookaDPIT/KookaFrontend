import { useTranslation } from 'react-i18next';
import './ModerationBar.css';

/* ==========================================================================
   ModerationBar — the staff strip that sits above a recipe or a forum thread.

   Moderators run into most problems while reading, not while scrolling a
   queue, so the action belongs on the page itself. The bar also doubles as the
   only visible sign that a piece of content is hidden: hidden content still
   opens for its author and for staff, and without this they would have no way
   to tell it is no longer public.
   ========================================================================== */
export default function ModerationBar({ hidden, onHide, onRestore, hiddenNote }) {
  const { t } = useTranslation();

  return (
    <div className={`modbar ${hidden ? 'is-hidden' : ''}`}>
      <span className="modbar__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 3l7.5 3v5.6c0 4.6-3.1 8.8-7.5 10-4.4-1.2-7.5-5.4-7.5-10V6z" />
          <path d="M9 12l2.2 2.2L15.5 10" />
        </svg>
      </span>

      <span className="modbar__text">
        <b>{t('moderation.label')}</b>
        <small>{hidden ? hiddenNote : t('moderation.visibleNote')}</small>
      </span>

      {hidden ? (
        <button type="button" className="modbar__btn modbar__btn--go" onClick={onRestore}>
          {t('moderation.restore')}
        </button>
      ) : (
        <button type="button" className="modbar__btn" onClick={onHide}>
          {t('moderation.hide')}
        </button>
      )}
    </div>
  );
}

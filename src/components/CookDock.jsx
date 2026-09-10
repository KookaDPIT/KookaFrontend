import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { endCook, useCookSession } from '../cook';
import CookTimer from './CookTimer';
import Modal from './Modal';
import './CookDock.css';

/* ==========================================================================
   COOK DOCK — the pan you left on the stove, pinned to the corner.

   Shown on every screen inside the app shell except the cook-along itself.
   Tapping it puts you back on the step you left; the timer keeps counting
   either way, because the clock lives in the shared session, not here.

   "Give up" is deliberately a separate, confirmed action rather than a close
   ×: abandoning means you never reach the photo check, so the recipe's XP is
   not awarded — that deserves an explicit yes.
   ========================================================================== */
export default function CookDock() {
  const session = useCookSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // On the cook-along itself the dock would be a duplicate of the page.
  const onCookPage = /^\/recipe\/\d+\/cook$/.test(location.pathname);
  if (!session || onCookPage) return null;

  const step = Math.min(session.stepIndex + 1, session.totalSteps || 1);
  const percent = session.totalSteps
    ? Math.round((step / session.totalSteps) * 100)
    : 0;

  const forfeit = () => {
    endCook();
    setConfirmOpen(false);
  };

  return (
    <>
      <aside className="cdock" aria-label={t('cook.dockTitle')}>
        <button
          type="button"
          className="cdock__main"
          onClick={() => navigate(`/recipe/${session.recipeId}/cook`)}
        >
          <span
            className="cdock__photo"
            aria-hidden="true"
            style={session.image ? { backgroundImage: `url(${session.image})` } : undefined}
          >
            {!session.image && '🍳'}
          </span>
          <span className="cdock__text">
            <span className="cdock__label">{t('cook.dockTitle')}</span>
            <span className="cdock__title">{session.title}</span>
            <span className="cdock__step">
              {t('cook.stepOf', { n: step, total: session.totalSteps })}
            </span>
          </span>
        </button>

        <div className="cdock__bar" aria-hidden="true">
          <i style={{ width: `${percent}%` }} />
        </div>

        {session.timer && (
          <div className="cdock__timer">
            <CookTimer compact />
          </div>
        )}

        <div className="cdock__actions">
          <button
            type="button"
            className="cdock__resume"
            onClick={() => navigate(`/recipe/${session.recipeId}/cook`)}
          >
            {t('cook.resume')}
          </button>
          <button
            type="button"
            className="cdock__forfeit"
            onClick={() => setConfirmOpen(true)}
          >
            {t('cook.forfeit')}
          </button>
        </div>
      </aside>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('cook.forfeitTitle')}
        footer={
          <>
            <button type="button" className="kbtn kbtn--ghost" onClick={() => setConfirmOpen(false)}>
              {t('cook.keepCooking')}
            </button>
            <button type="button" className="kbtn kbtn--danger" onClick={forfeit}>
              {t('cook.forfeitConfirm')}
            </button>
          </>
        }
      >
        <p className="cdock__confirm">{t('cook.forfeitNote', { title: session.title })}</p>
      </Modal>
    </>
  );
}

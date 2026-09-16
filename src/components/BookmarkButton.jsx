import { useTranslation } from 'react-i18next';
import { toggleBookmark, useBookmarks } from '../bookmarks';
import './BookmarkButton.css';

/* ==========================================================================
   The bookmark toggle — the ribbon with the notched bottom edge, the shape
   every short-video app has trained people to read as "save this for later".

   It sits on top of a recipe card, which is a <Link>, so the click has to be
   stopped from bubbling or tapping save would navigate to the recipe instead.
   ========================================================================== */
export default function BookmarkButton({ recipeId, size = 'md', className = '' }) {
  const { t } = useTranslation();
  const ids = useBookmarks();
  const on = ids.has(recipeId);

  const click = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(recipeId);
  };

  return (
    <button
      type="button"
      className={`bmk bmk--${size} ${on ? 'is-on' : ''} ${className}`}
      onClick={click}
      aria-pressed={on}
      aria-label={on ? t('bookmarks.remove') : t('bookmarks.add')}
      title={on ? t('bookmarks.remove') : t('bookmarks.add')}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v15.2a.8.8 0 0 1-1.22.68L12 16.9l-6.28 3.98A.8.8 0 0 1 4.5 20.2V5A1.5 1.5 0 0 1 6 3.5z" />
      </svg>
    </button>
  );
}

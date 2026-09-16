import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getBookmarkedRecipes, useBookmarks } from '../bookmarks';
import Modal from './Modal';
import RecipeCard from './RecipeCard';
import './BookmarkPanel.css';

/* ==========================================================================
   The saved list, opened from the button next to the rank on Home.

   A wishlist rather than a plan: the calendar already answers "when am I
   cooking this", and most of the time the honest answer is "no idea, but I
   don't want to lose it".

   The list is re-fetched each time the panel opens rather than cached. A
   bookmark added on a phone should be here when the panel opens on a laptop,
   and the panel opens rarely enough that one call is nothing.
   ========================================================================== */
export default function BookmarkPanel({ open, onClose }) {
  const { t } = useTranslation();
  const ids = useBookmarks();
  const [recipes, setRecipes] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    // Every setState sits after an `await`, i.e. in an async continuation
    // rather than in the synchronous effect body (react-hooks/set-state-in-effect).
    const load = async () => {
      await Promise.resolve();
      if (!alive) return;
      setRecipes(null);
      try {
        const list = await getBookmarkedRecipes();
        if (alive) setRecipes(list);
      } catch {
        if (alive) setRecipes([]);
      }
    };
    load();
    return () => { alive = false; };
  }, [open]);

  /* Un-bookmarking from inside the panel takes the card out immediately. The
     alternative — leaving it there until the next open — makes the button look
     broken, and re-fetching on every toggle would fight the optimistic update. */
  const shown = (recipes || []).filter((r) => ids.has(r.id));

  return (
    <Modal open={open} onClose={onClose} title={t('bookmarks.title')}>
      <p className="bmkp__sub">{t('bookmarks.subtitle')}</p>

      {recipes === null ? (
        <p className="bmkp__state">{t('common.loading')}…</p>
      ) : shown.length === 0 ? (
        <p className="bmkp__state">{t('bookmarks.empty')}</p>
      ) : (
        <div className="bmkp__grid">
          {shown.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </Modal>
  );
}

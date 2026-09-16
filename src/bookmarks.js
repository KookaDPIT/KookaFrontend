import { useEffect, useState } from 'react';
import api from './api';
import { isLoggedIn } from './user';

/* ==========================================================================
   Bookmarks — the "I want to cook this some day" list.

   The whole set of ids lives here rather than on each recipe payload. A card
   needs to know whether it is bookmarked, and cards show up in the feed, in
   search, in the profile and in the chat — asking the backend per card would
   be one query per tile. One fetch after sign-in, kept in memory, and every
   mounted `useBookmarks()` stays in sync through the same pub/sub the user and
   settings stores use.

   Toggles are optimistic: the button flips immediately and rolls back if the
   call fails. A bookmark is not worth a spinner.
   ========================================================================== */

const EVENT = 'kooka:bookmarks';

let ids = new Set();
/* Which account the set in memory belongs to. `null` means nothing has been
   loaded yet; an id means "these are that person's bookmarks". Keyed by owner
   rather than by a plain `loaded` flag because refreshUser() runs on every
   mount of useUser() — with a boolean, each of those forced a refetch and one
   page load turned into a dozen /me/bookmarks calls. */
let loadedFor = null;
let inflight = null;

function broadcast() {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: new Set(ids) }));
}

/* Fetch once per session. Concurrent callers share the same request, so four
   mounted components on the first render do not make four calls. */
export function loadBookmarks({ owner = null } = {}) {
  if (!isLoggedIn()) {
    ids = new Set();
    loadedFor = null;
    broadcast();
    return Promise.resolve(ids);
  }
  // Already have this account's set, or have some set and no reason to think
  // it belongs to anyone else.
  if (loadedFor !== null && (owner === null || owner === loadedFor)) {
    return Promise.resolve(ids);
  }
  if (inflight) return inflight;

  inflight = api
    .get('/me/bookmarks')
    .then(({ data }) => {
      ids = new Set(data.ids || []);
      loadedFor = owner ?? loadedFor ?? 'me';
      broadcast();
      return ids;
    })
    .catch(() => ids) // offline: an empty set is wrong but harmless
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function clearBookmarks() {
  ids = new Set();
  loadedFor = null;
  broadcast();
}

export function isBookmarked(recipeId) {
  return ids.has(recipeId);
}

/* Flip one recipe. Returns the new state so callers can react without waiting
   for the store event. */
export async function toggleBookmark(recipeId) {
  const was = ids.has(recipeId);
  const next = new Set(ids);
  if (was) next.delete(recipeId);
  else next.add(recipeId);
  ids = next;
  broadcast();

  try {
    if (was) await api.delete(`/recipes/${recipeId}/bookmark`);
    else await api.post(`/recipes/${recipeId}/bookmark`);
    return !was;
  } catch {
    // put it back exactly as it was, rather than leaving the button lying
    const rolled = new Set(ids);
    if (was) rolled.add(recipeId);
    else rolled.delete(recipeId);
    ids = rolled;
    broadcast();
    return was;
  }
}

/* The full list with recipe payloads — only the panel needs this, so it is a
   call rather than part of the store. */
export async function getBookmarkedRecipes() {
  const { data } = await api.get('/me/bookmarks');
  ids = new Set(data.ids || []);
  loadedFor = loadedFor ?? 'me';
  broadcast();
  return data.recipes || [];
}

export function useBookmarks() {
  const [set, setSet] = useState(() => new Set(ids));

  useEffect(() => {
    const onChange = (e) => setSet(e.detail || new Set(ids));
    window.addEventListener(EVENT, onChange);
    loadBookmarks();
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  return set;
}

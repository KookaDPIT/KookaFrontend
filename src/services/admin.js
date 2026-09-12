import api from '../api';

/* Moderation + role tools. Every call here is behind the backend's
   get_current_admin / require_role("admin") dependencies, so a plain user who
   forces the route just gets 403s — the UI guard is convenience, not security. */

export const ROLES = ['user', 'moderator', 'admin'];

// ----- dashboard -----
/* Totals, the last seven days, what is sitting in the queues, and a two-week
   trend. One request — the console should not need six to draw a summary. */
export async function getModerationStats() {
  const { data } = await api.get('/admin/stats');
  return data;
}

// ----- recipes -----
export async function getModerationQueue(status = 'flagged') {
  const { data } = await api.get('/admin/recipes', { params: { status } });
  return data;
}

export async function hideRecipe(id) {
  const { data } = await api.post(`/admin/recipes/${id}/hide`);
  return data;
}

export async function deleteRecipe(id) {
  const { data } = await api.delete(`/admin/recipes/${id}`);
  return data;
}

export async function restoreRecipe(id) {
  const { data } = await api.post(`/admin/recipes/${id}/restore`);
  return data;
}

/* Re-run the AI pass that fills in nutrition and allergens.

   That analysis happens once, when a recipe is published. Anything older than
   those fields — imported recipes, or ones saved while Groq was down — kept
   zeroes and an empty allergen list, and both the "free of my allergens"
   filter and the warning on the recipe page read exactly those fields. */
export async function analyzeRecipe(id) {
  const { data } = await api.post(`/admin/recipes/${id}/analyze`);
  return data; // { ok, flagged, reason?, recipe }
}

/* The same pass over every recipe, one small batch per request.

   Not one long request: an HTTP call that runs for minutes dies on any proxy,
   and Groq's free tier is metered per minute — a single giant batch would take
   a 429 halfway through. `runAnalyzeAll` below drives the loop and reports
   progress as it goes.

   `scope` is 'missing' (only recipes with no nutrition or no allergens — what
   you want after the analyser has been down) or 'all'. */
export async function analyzeAllBatch({ scope = 'missing', limit = 5, afterId = 0 } = {}) {
  const { data } = await api.post('/admin/recipes/analyze-all', null, {
    params: { scope, limit, after_id: afterId },
  });
  return data; // { processed, updated, flagged, remaining, total, last_id, stopped }
}

/* Walk the whole catalogue, calling `onProgress` after each batch.

   Stops when the backend says there is nothing left, when it reports the
   analyser is unavailable, or when `shouldStop()` says the operator changed
   their mind. Whatever was written before stopping stays written. */
export async function runAnalyzeAll({ scope = 'missing', onProgress, shouldStop } = {}) {
  let afterId = 0;
  let updated = 0;
  let flagged = 0;
  let stopped = '';

  // A hard ceiling on iterations. The cursor and the `remaining` count should
  // always terminate this on their own; the cap is here so a backend that
  // answered oddly could never spin the browser forever.
  for (let round = 0; round < 400; round += 1) {
    if (shouldStop?.()) { stopped = 'cancelled'; break; }

    const batch = await analyzeAllBatch({ scope, afterId });
    updated += batch.updated;
    flagged += batch.flagged;
    afterId = batch.last_id ?? afterId;
    onProgress?.({ updated, flagged, remaining: batch.remaining, total: batch.total });

    if (batch.stopped) { stopped = batch.stopped; break; }
    if (batch.remaining <= 0 || batch.processed === 0) break;
  }

  return { updated, flagged, stopped };
}

// ----- forum -----
export async function getForumQueue({ status = 'ok', q = '' } = {}) {
  const { data } = await api.get('/admin/forum/posts', { params: { status, q } });
  return data;
}

export async function hideForumPost(id) {
  const { data } = await api.post(`/admin/forum/posts/${id}/hide`);
  return data;
}

export async function restoreForumPost(id) {
  const { data } = await api.post(`/admin/forum/posts/${id}/restore`);
  return data;
}

export async function deleteForumPost(id) {
  const { data } = await api.delete(`/admin/forum/posts/${id}`);
  return data;
}

// ----- users -----
export async function listUsers({ q = '', role = '' } = {}) {
  const { data } = await api.get('/admin/users', { params: { q, role } });
  return data;
}

export async function setUserRole(id, role) {
  const { data } = await api.patch(`/admin/users/${id}/role`, { role });
  return data;
}

/* The menu of sanctions, shortest first. Hours (not days) so a one-day cool-off
   is possible; `days` is derived for the backend's older field. */
export const SUSPENSIONS = [
  { key: '12h', hours: 12 },
  { key: '1d', hours: 24 },
  { key: '3d', hours: 72 },
  { key: '7d', hours: 168 },
  { key: '30d', hours: 720 },
  { key: '90d', hours: 2160 },
  { key: '1y', hours: 8760 },
];

export async function suspendUser(id, hours = 168) {
  const { data } = await api.post(`/admin/users/${id}/suspend`, {
    hours,
    days: Math.max(1, Math.round(hours / 24)),
  });
  return data;
}

export async function unsuspendUser(id) {
  const { data } = await api.delete(`/admin/users/${id}/suspend`);
  return data;
}

export async function deactivateUser(id) {
  const { data } = await api.post(`/admin/users/${id}/deactivate`);
  return data;
}

export async function activateUser(id) {
  const { data } = await api.post(`/admin/users/${id}/activate`);
  return data;
}

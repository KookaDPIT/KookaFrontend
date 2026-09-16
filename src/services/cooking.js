import api from '../api';

/* Cook-along session reporting.

   The backend keeps one row per attempt (models.CookSession) and the trophies
   are read off it: how long it took, how often you asked for help, whether you
   skipped the timers, whether you walked out of the app, whether you gave up.
   None of that can be reconstructed from the finished state.

   Every call here is fire-and-forget. A dropped event costs a trophy, not a
   dinner, so nothing in this file is ever allowed to throw into the cook page. */

export async function startCookSession(recipeId, { stepsTotal = 0, timersAvailable = 0 } = {}) {
  try {
    const { data } = await api.post('/cook/sessions', {
      recipe_id: recipeId,
      steps_total: stepsTotal,
      timers_available: timersAvailable,
    });
    return data.id;
  } catch {
    return null;
  }
}

export function reportCookEvent(sessionId, patch) {
  if (!sessionId) return Promise.resolve();
  return api.patch(`/cook/sessions/${sessionId}`, patch).catch(() => {});
}

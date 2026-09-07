import api from '../api';

/* AI endpoints that need app context (as opposed to the silent AI that runs
   during recipe creation). */

/**
 * Ask Kooka a question while cooking a specific recipe.
 *
 * The backend already has the recipe, so we only send where the cook is and
 * the last few turns — that is what lets "how long does this take?" resolve to
 * the step actually on screen.
 *
 * @param {number|string} recipeId
 * @param {{ stepIndex: number, message: string, history?: {role: string, text: string}[] }} opts
 * @returns {Promise<{ text: string, ok: boolean }>}
 */
export async function askWhileCooking(recipeId, { stepIndex = 0, message, history = [] }) {
  const { data } = await api.post(`/ai/cook/${recipeId}`, {
    message,
    step_index: stepIndex,
    // only plain text turns are useful as context — typing bubbles are dropped
    history: history
      .filter((m) => m.text)
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text })),
  });
  return data;
}

import api from '../api';

/* AI endpoints that need app context (as opposed to the silent AI that runs
   during recipe creation and moderation). */

/* ---------------------------------------------------------------- cook-along */

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

/* --------------------------------------------------------------- free chat */

/** The conversations in the sidebar, newest first. */
export async function listConversations() {
  const { data } = await api.get('/ai/chat');
  return data;
}

/** One conversation with its full message list. */
export async function getConversation(id) {
  const { data } = await api.get(`/ai/chat/${id}`);
  return data;
}

export async function deleteConversation(id) {
  await api.delete(`/ai/chat/${id}`);
}

/**
 * Send one message. Omit `conversationId` to start a new thread — the reply
 * comes back with the conversation the server created, title included.
 *
 * `image` is a data URL. The photo reaches the model once and is never stored,
 * which is why reloading a thread shows the bubble but not the picture.
 *
 * @returns {Promise<{ conversation: object, message: object, ok: boolean }>}
 */
export async function sendChatMessage({ message = '', conversationId = null, image = '' }) {
  const { data } = await api.post('/ai/chat', {
    message,
    conversation_id: conversationId,
    image,
  });
  return data;
}

/** Read a File into the data URL the chat endpoint expects. */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that image'));
    reader.readAsDataURL(file);
  });
}

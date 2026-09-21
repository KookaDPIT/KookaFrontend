import api from '../api';

/* Recipes API wrappers over the shared axios instance. */

/* `pantry` only matters for the fridge filter: a comma-separated list of what
   the cook actually has, which the backend scores each recipe against. */
export async function listRecipes({
  q = '', filter = '', pantry = '', limit = 20, offset = 0,
} = {}) {
  const { data } = await api.get('/recipes', {
    params: { q, filter, pantry, limit, offset },
  });
  return data;
}

export async function getRecipe(id) {
  const { data } = await api.get(`/recipes/${id}`);
  return data;
}

export async function createRecipe(payload) {
  const { data } = await api.post('/recipes', payload);
  return data;
}

export async function updateRecipe(id, payload) {
  const { data } = await api.put(`/recipes/${id}`, payload);
  return data;
}

export async function deleteRecipe(id) {
  await api.delete(`/recipes/${id}`);
}

/* Hide or restore straight from the recipe page (moderators only). */
export async function moderateRecipe(id, action) {
  const { data } = await api.post(`/recipes/${id}/moderate`, { action });
  return data;
}

/* Translate a recipe into `lang`, on demand.

   Nothing is translated automatically: a recipe is stored in English and read
   in the language its author wrote it in, and turning every page view into a
   model call to produce a third version nobody asked for would be slow and
   expensive. This runs when somebody presses the button, and the backend
   keeps the result so the second reader pays nothing.

   Rejects with 503 when the model is unreachable — the caller should say so
   rather than silently showing the untranslated text. */
export async function translateRecipe(id, lang) {
  const { data } = await api.post(`/recipes/${id}/translate`, null, { params: { lang } });
  return data; // { language, cached, translated, title, description, ingredients, steps }
}

export async function getDailyDish() {
  const { data } = await api.get('/daily-dish');
  return data.daily; // null when the catalogue is empty
}

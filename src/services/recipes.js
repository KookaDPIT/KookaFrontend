import api from '../api';

/* Recipes API wrappers over the shared axios instance. */

export async function listRecipes({ q = '', filter = '', limit = 20, offset = 0 } = {}) {
  const { data } = await api.get('/recipes', { params: { q, filter, limit, offset } });
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

export async function getDailyDish() {
  const { data } = await api.get('/daily-dish');
  return data.daily; // null when the catalogue is empty
}

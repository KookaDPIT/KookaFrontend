import api from '../api';

/* Global search: recipes (by name/country) + users (by name/username). */
export async function search(q) {
  const { data } = await api.get('/search', { params: { q } });
  return data; // { recipes: [...], users: [...] }
}

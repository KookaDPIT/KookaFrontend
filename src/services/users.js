import api from '../api';

/* Users, follow graph, culinary passport. */

export async function getUser(id) {
  const { data } = await api.get(`/users/${id}`);
  return data;
}

export async function getUserRecipes(id) {
  const { data } = await api.get(`/users/${id}/recipes`);
  return data;
}

export async function follow(id) {
  const { data } = await api.post(`/users/${id}/follow`);
  return data;
}

export async function unfollow(id) {
  const { data } = await api.delete(`/users/${id}/follow`);
  return data;
}

/* What earned the stamp for one country: recipes published there and recipes
   from there that this cook has actually made. */
export async function getPassportCountry(id, country) {
  const { data } = await api.get(`/users/${id}/passport/${encodeURIComponent(country)}`);
  return data; // { country, recipes: [{...recipe, how}], total }
}

/* Removing an activity entry is a display choice, not a deletion — the recipe
   or review underneath stays exactly where it is. */
export async function hideActivity(kind, entryId) {
  const { data } = await api.post('/me/activity/hide', { kind, entry_id: entryId });
  return data;
}

export async function restoreAllActivity() {
  const { data } = await api.delete('/me/activity/hide');
  return data;
}

export async function getBlocked() {
  const { data } = await api.get('/me/blocked');
  return data;
}

export async function blockUser(id) {
  const { data } = await api.post(`/users/${id}/block`);
  return data;
}

export async function unblockUser(id) {
  const { data } = await api.delete(`/users/${id}/block`);
  return data;
}

export async function getPassport(id) {
  const { data } = await api.get(`/users/${id}/passport`);
  return data; // { countries: [{country, count}], total }
}

export async function getUserActivity(id) {
  const { data } = await api.get(`/users/${id}/activity`);
  return data; // [{ kind, what, recipe_id, when }]
}

export async function updateProfile(payload) {
  const { data } = await api.patch('/me', payload);
  return data;
}

export async function changePassword(payload) {
  // { current_password, new_password }
  const { data } = await api.patch('/me/password', payload);
  return data;
}

/* Is this username / email already taken? Used by the signup form for live
   feedback. Only the fields you pass are checked, and the backend answers with
   plain booleans — it never reveals whose account holds them. */
export async function checkAvailability({ username, email } = {}) {
  const params = {};
  if (username) params.username = username;
  if (email) params.email = email;
  if (!Object.keys(params).length) return {};
  const { data } = await api.get('/auth/availability', { params });
  return data; // { username_taken?: bool, email_taken?: bool }
}

/* The XP leaderboard. `scope` is 'global' or 'friends' (mutual follows only).
   The response always carries `me`, even when your row is off the page — the
   whole point is answering "where am I?". */
export async function getLeaderboard(scope = 'global', limit = 50) {
  const { data } = await api.get('/leaderboard', { params: { scope, limit } });
  return data; // { scope, total, entries: [...], me }
}

/* The allergen vocabulary the backend matches recipes against. */
export async function getAllergenCatalog() {
  const { data } = await api.get('/allergens');
  return data.allergens || [];
}

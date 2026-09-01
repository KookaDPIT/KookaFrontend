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

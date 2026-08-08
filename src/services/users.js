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

export async function updateProfile(payload) {
  const { data } = await api.patch('/me', payload);
  return data;
}

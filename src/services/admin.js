import api from '../api';

/* Moderation + role tools. Every call here is behind the backend's
   get_current_admin / require_role("admin") dependencies, so a plain user who
   forces the route just gets 403s — the UI guard is convenience, not security. */

export const ROLES = ['user', 'moderator', 'admin'];

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

// ----- users -----
export async function listUsers({ q = '', role = '' } = {}) {
  const { data } = await api.get('/admin/users', { params: { q, role } });
  return data;
}

export async function setUserRole(id, role) {
  const { data } = await api.patch(`/admin/users/${id}/role`, { role });
  return data;
}

export async function suspendUser(id, days = 7) {
  const { data } = await api.post(`/admin/users/${id}/suspend`, { days });
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

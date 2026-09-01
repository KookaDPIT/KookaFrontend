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

export async function restoreRecipe(id) {
  const { data } = await api.post(`/admin/recipes/${id}/restore`);
  return data;
}

// ----- forum -----
export async function getForumQueue({ status = 'ok', q = '' } = {}) {
  const { data } = await api.get('/admin/forum/posts', { params: { status, q } });
  return data;
}

export async function hideForumPost(id) {
  const { data } = await api.post(`/admin/forum/posts/${id}/hide`);
  return data;
}

export async function restoreForumPost(id) {
  const { data } = await api.post(`/admin/forum/posts/${id}/restore`);
  return data;
}

export async function deleteForumPost(id) {
  const { data } = await api.delete(`/admin/forum/posts/${id}`);
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

/* The menu of sanctions, shortest first. Hours (not days) so a one-day cool-off
   is possible; `days` is derived for the backend's older field. */
export const SUSPENSIONS = [
  { key: '12h', hours: 12 },
  { key: '1d', hours: 24 },
  { key: '3d', hours: 72 },
  { key: '7d', hours: 168 },
  { key: '30d', hours: 720 },
  { key: '90d', hours: 2160 },
  { key: '1y', hours: 8760 },
];

export async function suspendUser(id, hours = 168) {
  const { data } = await api.post(`/admin/users/${id}/suspend`, {
    hours,
    days: Math.max(1, Math.round(hours / 24)),
  });
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

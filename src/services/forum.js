import api from '../api';

/* Forum API. Subforums are languages; the topic is carried by the tag. */

const EMPTY_META = {
  languages: [], all_languages: [], tags: [], trending: [], total: 0,
};

/* Normalised here rather than at each call site: a field the server omits
   (an older deploy, a partial response) would otherwise reach the UI as
   `undefined` and take the whole page down on the first `.map` or `.length`. */
export async function getForumMeta() {
  const { data } = await api.get('/forum/meta');
  return {
    ...EMPTY_META,
    ...data,
    languages: Array.isArray(data?.languages) ? data.languages : [],
    all_languages: Array.isArray(data?.all_languages) ? data.all_languages : [],
    tags: Array.isArray(data?.tags) ? data.tags : [],
    trending: Array.isArray(data?.trending) ? data.trending : [],
  };
}

export async function listPosts({
  q = '', language = '', tag = '', sort = 'hot', limit = 60, offset = 0,
} = {}) {
  const { data } = await api.get('/forum/posts', {
    params: { q, language, tag, sort, limit, offset },
  });
  return data; // { total, posts[] }
}

export async function getPost(id) {
  const { data } = await api.get(`/forum/posts/${id}`);
  return data;
}

export async function createPost(payload) {
  // { title, body, language, tag }
  const { data } = await api.post('/forum/posts', payload);
  return data;
}

export async function updatePost(id, payload) {
  const { data } = await api.patch(`/forum/posts/${id}`, payload);
  return data;
}

export async function deletePost(id) {
  await api.delete(`/forum/posts/${id}`);
}

/* Sending the same value again retracts the vote — the backend decides, so the
   response is the source of truth for both the count and my own vote. */
export async function votePost(id, value) {
  const { data } = await api.post(`/forum/posts/${id}/vote`, { value });
  return data; // { votes, my_vote }
}

/* Hide or restore straight from the thread (moderators only). */
export async function moderatePost(id, action) {
  const { data } = await api.post(`/forum/posts/${id}/moderate`, { action });
  return data;
}

export async function addComment(postId, body, parentId = null) {
  const { data } = await api.post(`/forum/posts/${postId}/comments`, {
    body,
    parent_id: parentId,
  });
  return data;
}

export async function deleteComment(id) {
  await api.delete(`/forum/comments/${id}`);
}

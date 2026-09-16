import api from '../api';

/* Reviews + cook verification. */

export async function listReviews(recipeId) {
  const { data } = await api.get(`/recipes/${recipeId}/reviews`);
  return data; // { avg_rating, count, can_review, my_review, items }
}

export async function addReview(recipeId, payload) {
  const { data } = await api.post(`/recipes/${recipeId}/reviews`, payload);
  return data;
}

export async function editReview(reviewId, payload) {
  const { data } = await api.put(`/reviews/${reviewId}`, payload);
  return data;
}

export async function deleteReview(reviewId) {
  await api.delete(`/reviews/${reviewId}`);
}

/* Ask the AI to confirm the cook photo before unlocking reviews.
   The photo is sent straight to the backend for the AI check and is NOT stored
   anywhere (no ImageKit) — pass the raw File. */
export async function verifyCook(recipeId, file, sessionId = 0) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post(`/recipes/${recipeId}/cook/verify`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // The cook-along session this photo belongs to. It closes the session
    // (or counts the rejection), which is what several trophies read.
    params: sessionId ? { session_id: sessionId } : undefined,
  });
  return data; // { verified, reason, can_review, cook_xp, rank, … }
}

/* Recent reviews across all recipes (with recipe info) for the Home page. */
export async function recentReviews(limit = 8) {
  const { data } = await api.get('/reviews/recent', { params: { limit } });
  return data; // [{ ..., recipe: {id, title, image_url, origin} }]
}

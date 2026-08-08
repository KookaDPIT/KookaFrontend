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

/* Ask the AI to confirm the cook photo before unlocking reviews. */
export async function verifyCook(recipeId, cookPhotoUrl) {
  const { data } = await api.post(`/recipes/${recipeId}/cook/verify`, {
    cook_photo_url: cookPhotoUrl,
  });
  return data; // { verified, reason, can_review }
}

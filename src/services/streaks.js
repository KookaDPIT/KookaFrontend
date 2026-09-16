import api from '../api';

/* Streaks — how many days in a row a habit has held.

   Four of them: lessons, daily challenges, cooking (any recipe you like), and
   the supreme one, which is the days you did all three. They are computed on
   the backend from the event history rather than stored, so the answer is
   always right no matter when it is asked (services/streaks.py). */

export async function getMyStreaks() {
  const { data } = await api.get('/me/streaks');
  return data; // { today, lessons, daily, cooking, supreme }
}

export async function getUserStreaks(id) {
  const { data } = await api.get(`/users/${id}/streaks`);
  return data;
}

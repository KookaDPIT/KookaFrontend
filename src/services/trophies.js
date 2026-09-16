import api from '../api';

/* Trophies — bronze, silver, gold, hidden and the platinum that needs all of
   them. Evaluated on the backend from the whole history (services/trophies.py),
   so the answer is the same on every device and cannot drift from the data.

   A hidden trophy you have not earned comes back with its name and description
   blanked out. That is deliberate and it happens server-side: blanking it in
   the browser would put the text one DevTools tab away. */
export async function getMyTrophies() {
  const { data } = await api.get('/me/trophies');
  return data; // { trophies: [...], totals: {...}, earned, total, newly_earned }
}

export async function getUserTrophies(id) {
  const { data } = await api.get(`/users/${id}/trophies`);
  return data;
}

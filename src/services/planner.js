import api from '../api';

/* Shopping list + meal calendar.

   Both used to live in localStorage, which meant they existed only in the
   browser you typed them into — the list you built on your phone was not there
   on the laptop, and clearing site data lost the week's plan. They are rows on
   the account now. */

// ---------- shopping list ----------

export async function listShopping() {
  const { data } = await api.get('/planner/shopping');
  return data; // [{ id, name, quantity, unit, checked, source, recipe_id }]
}

export async function addShoppingItem({ name, quantity = '', unit = '' }) {
  const { data } = await api.post('/planner/shopping', { name, quantity, unit });
  return data;
}

/* Editing in place is the point: in front of the shelf you correct the amount,
   you do not delete the line and type it again. */
export async function updateShoppingItem(id, patch) {
  const { data } = await api.patch(`/planner/shopping/${id}`, patch);
  return data;
}

export async function deleteShoppingItem(id) {
  await api.delete(`/planner/shopping/${id}`);
}

export async function clearShopping(checkedOnly = true) {
  await api.delete('/planner/shopping', { params: { checked_only: checkedOnly } });
}

export async function addRecipeToShopping(recipeId) {
  const { data } = await api.post(`/planner/shopping/from-recipe/${recipeId}`);
  return data; // { added, items }
}

// ---------- meal calendar ----------

export async function listMeals({ start = '', end = '' } = {}) {
  const { data } = await api.get('/planner/meals', { params: { start, end } });
  return data; // { start, end, entries: [...] }
}

export async function addMeal({ date, title = '', recipeId = null, slot = 'dinner' }) {
  const { data } = await api.post('/planner/meals', {
    date, title, recipe_id: recipeId, slot,
  });
  return data;
}

export async function updateMeal(id, patch) {
  const { data } = await api.patch(`/planner/meals/${id}`, patch);
  return data;
}

export async function deleteMeal(id) {
  await api.delete(`/planner/meals/${id}`);
}

/* The obvious link between the two panels: everything this dish needs, onto
   the list. */
export async function mealToShopping(id) {
  const { data } = await api.post(`/planner/meals/${id}/shopping`);
  return data;
}

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

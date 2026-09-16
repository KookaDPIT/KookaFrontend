/* Course types — what kind of dish a recipe is.

   The backend owns the vocabulary (`GET /courses`, services/courses.py): it is
   what the AI classifier picks from and what the filters validate against, so
   there can only be one list. This mirror exists so the search filters and the
   create form paint immediately, and still work if that call fails. Keep the
   ids in step with the Python side.

   Labels are translated through `courses.<id>` in i18n.js; `name` here is only
   the fallback for an id we do not know about. */
export const COURSES = [
  { id: 'breakfast', name: 'Breakfast', emoji: '🍳', meals: ['breakfast'] },
  { id: 'appetizer', name: 'Appetizer', emoji: '🥟', meals: ['lunch', 'dinner'] },
  { id: 'soup', name: 'Soup', emoji: '🥣', meals: ['lunch', 'dinner'] },
  { id: 'salad', name: 'Salad', emoji: '🥗', meals: ['lunch', 'dinner'] },
  { id: 'main', name: 'Main course', emoji: '🍽️', meals: ['lunch', 'dinner'] },
  { id: 'side', name: 'Side dish', emoji: '🥔', meals: ['lunch', 'dinner'] },
  { id: 'dessert', name: 'Dessert', emoji: '🍰', meals: ['lunch', 'dinner'] },
  { id: 'bakery', name: 'Bread & bakery', emoji: '🥖', meals: ['breakfast', 'snack'] },
  { id: 'snack', name: 'Snack', emoji: '🥨', meals: ['snack'] },
  { id: 'drink', name: 'Drink', emoji: '🥤', meals: ['breakfast', 'snack'] },
];

const BY_ID = Object.fromEntries(COURSES.map((c) => [c.id, c]));

export function courseEmoji(id) {
  return BY_ID[id]?.emoji || '🍽️';
}

/* Calorie bands, per serving.

   Bands rather than two number inputs: nobody knows whether their idea of
   "light" is 280 or 340 kcal, but everybody can pick "light" off a list. The
   upper open band has no max — `kcal_max: 0` means no ceiling on the API.

   The ceiling also excludes recipes sitting at 0 kcal, because zero is not
   "very light", it is "not analysed yet" (see _apply_facets on the backend). */
export const KCAL_BANDS = [
  { id: 'light', min: 0, max: 300 },
  { id: 'medium', min: 300, max: 600 },
  { id: 'hearty', min: 600, max: 900 },
  { id: 'big', min: 900, max: 0 },
];

export const KCAL_BAND_BY_ID = Object.fromEntries(KCAL_BANDS.map((b) => [b.id, b]));

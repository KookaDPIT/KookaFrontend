/* Allergen catalogue.

   The backend owns the real list (`GET /allergens`, services/allergens.py) —
   it is what recipe allergens are matched against, so there can only be one
   source. This mirror exists so the signup question and the settings screen
   can paint immediately, and still work if that call fails. Keep the ids in
   step with the Python side. */
export const ALLERGENS = [
  { id: 'gluten', label: 'Gluten', emoji: '🌾' },
  { id: 'milk', label: 'Milk & dairy', emoji: '🥛' },
  { id: 'eggs', label: 'Eggs', emoji: '🥚' },
  { id: 'peanuts', label: 'Peanuts', emoji: '🥜' },
  { id: 'nuts', label: 'Tree nuts', emoji: '🌰' },
  { id: 'soy', label: 'Soy', emoji: '🫘' },
  { id: 'fish', label: 'Fish', emoji: '🐟' },
  { id: 'crustaceans', label: 'Crustaceans', emoji: '🦐' },
  { id: 'molluscs', label: 'Molluscs', emoji: '🦪' },
  { id: 'sesame', label: 'Sesame', emoji: '🫓' },
  { id: 'celery', label: 'Celery', emoji: '🥬' },
  { id: 'mustard', label: 'Mustard', emoji: '🌭' },
  { id: 'lupin', label: 'Lupin', emoji: '🌱' },
  { id: 'sulphites', label: 'Sulphites', emoji: '🍷' },
];

const BY_ID = Object.fromEntries(ALLERGENS.map((a) => [a.id, a]));

/* An id we do not know about is still shown — someone may have typed their
   own, and hiding it would look like it had been dropped. */
export function allergenLabel(id) {
  return BY_ID[id]?.label || String(id).replace(/^\w/, (c) => c.toUpperCase());
}

export function allergenEmoji(id) {
  return BY_ID[id]?.emoji || '⚠️';
}

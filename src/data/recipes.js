/* ==========================================================================
   Mock recipe catalogue — keyed by UUID.
   Each recipe carries what the recipe page needs (ingredients + long-form
   method) and what the cook-along needs (short imperative `steps`, some with a
   timer). Swap `getRecipe` for a backend fetch by id later:
     const { data } = await api.get(`/recipes/${id}`);
   ========================================================================== */

export const RECIPES = {
  '3f9a1c02-1b7e-4c66-9a1e-5c2b0d8e0001': {
    id: '3f9a1c02-1b7e-4c66-9a1e-5c2b0d8e0001',
    title: 'Pasta carbonara',
    tagline: 'Roman classic · creamy, no cream',
    meta: { time: '25 min', servings: '2 servings', kcal: '620 kcal', level: 'easy' },
    // per serving — `max` = reference daily intake, used for the speedometer needle
    nutrition: [
      { key: 'kcal', label: 'Calories', value: 620, unit: 'kcal', max: 2000 },
      { key: 'prot', label: 'Protein', value: 28, unit: 'g', max: 50 },
      { key: 'fat', label: 'Fat', value: 30, unit: 'g', max: 70 },
      { key: 'carb', label: 'Carbs', value: 58, unit: 'g', max: 260 },
      { key: 'salt', label: 'Salt', value: 1.6, unit: 'g', max: 6 },
    ],
    allergens: {
      contains: ['Gluten', 'Eggs', 'Dairy'],
      free: ['Nuts', 'Soy', 'Fish'],
    },
    ingredients: [
      '200 g spaghetti',
      '100 g guanciale (or bacon)',
      '2 egg yolks + 1 whole egg',
      '50 g grated parmesan',
      '50 g grated pecorino',
      'freshly ground black pepper',
      'salt for the pasta water',
    ],
    method: [
      'Bring 3 liters of water to a boil with a good pinch of salt. Do not add oil.',
      'Dice the guanciale small and render it in a cold pan over medium heat until crisp and its fat has rendered out. Turn off the heat.',
      'In a bowl, mix the yolks, whole egg, parmesan, pecorino and plenty of pepper into a thick paste.',
      'Cook the spaghetti al dente — about 1 minute less than the package says. Reserve a cup of the cooking water.',
      'Take the pan off the heat. Pour the egg and cheese mixture over the pasta and toss vigorously for 30 seconds so it turns creamy without scrambling.',
      'Add 2–3 tablespoons of the pasta water, a little at a time, until the sauce turns silky. Serve immediately with parmesan and pepper on top.',
    ],
    steps: [
      { text: 'Bring 3 liters of water to a boil with a good pinch of salt.' },
      { text: 'Cook the spaghetti al dente, about a minute less than the package says.', timer: '8:30', label: 'boil' },
      { text: 'Dice the guanciale and render it over medium heat until crisp.', timer: '4:00', label: 'render' },
      { text: 'Mix the yolks, egg, parmesan and pecorino with plenty of pepper.' },
      { text: 'Take the pan off the heat. Pour in the egg and cheese mixture and toss vigorously for 30 seconds.', timer: '0:27', label: 'toss' },
      { text: 'Add 2–3 tablespoons of the pasta water and work the sauce until silky.' },
      { text: 'Serve immediately with parmesan and freshly ground pepper.' },
    ],
  },

  '7c2e5d88-4a13-49b0-8f2a-6d1c9b4e0002': {
    id: '7c2e5d88-4a13-49b0-8f2a-6d1c9b4e0002',
    title: 'Grilled chicken with new potatoes',
    tagline: 'over charcoal · lemon, thyme and hot honey',
    meta: { time: '1 h 30 min', servings: '4 servings', kcal: '710 kcal', level: 'medium' },
    nutrition: [
      { key: 'kcal', label: 'Calories', value: 710, unit: 'kcal', max: 2000 },
      { key: 'prot', label: 'Protein', value: 48, unit: 'g', max: 50 },
      { key: 'fat', label: 'Fat', value: 38, unit: 'g', max: 70 },
      { key: 'carb', label: 'Carbs', value: 42, unit: 'g', max: 260 },
      { key: 'salt', label: 'Salt', value: 1.2, unit: 'g', max: 6 },
    ],
    allergens: {
      contains: ['Dairy', 'Mustard'],
      free: ['Gluten', 'Eggs', 'Nuts'],
    },
    ingredients: [
      '1.2 kg new potatoes',
      '2 lemons',
      '1 head of garlic',
      '1 bunch of thyme (20 g)',
      '3 bay leaves',
      '2 hot chili peppers',
      '1 free-range chicken (1.5 kg)',
      '3 tablespoons hot honey, plus 1 teaspoon',
      '100 g unsalted butter (softened)',
      '1 teaspoon Dijon mustard',
      'extra-virgin olive oil',
      '2 large bunches of watercress',
      '2 large bunches of wild rocket',
    ],
    method: [
      'Light the charcoal grill and let it settle to glowing embers.',
      'Wash the potatoes and put them in a sturdy roasting tray. Peel the zest from both lemons and slice it thin, then halve the garlic and one lemon and add them to the tray with the bay leaves and half the thyme. Slice the chilies, remove the seeds and add them. Toss well.',
      'Put the softened butter and 2 tablespoons of honey in a bowl with a pinch of salt and pepper. Strip in the rest of the thyme leaves and knead everything together well.',
      'With a large knife, cut along the backbone of the chicken so you can open it out like a book, then score the legs. Carefully loosen the skin over the breast.',
      'Push most of the butter under the skin, working a little under the leg skin too, then rub the rest all over the chicken.',
      'Set the tray of potatoes down in the grill among the coals, and the chicken on the grate above, skin side up. Cook with the lid on for about 1 hour, until golden and cooked through (65–70 °C inside).',
    ],
    steps: [
      { text: 'Light the charcoal grill and let it settle to glowing embers.' },
      { text: 'Prep the potato tray with lemon, garlic, bay, thyme and chilies.' },
      { text: 'Make the flavored butter: softened butter, hot honey, thyme, salt and pepper.' },
      { text: 'Open the chicken out flat like a book and gently loosen the breast skin.' },
      { text: 'Push the butter under the skin and rub it all over the chicken.', timer: '2:00', label: 'massage' },
      { text: 'Cook on the grill with the lid on until golden and cooked through.', timer: '60:00', label: 'cook' },
      { text: 'Let the chicken rest over the potatoes, then serve with the leafy salad.', timer: '10:00', label: 'rest' },
    ],
  },
};

export const RECIPE_IDS = Object.keys(RECIPES);

/* Fallback to the first recipe so unknown/demo links still render something. */
export function getRecipe(id) {
  return RECIPES[id] || RECIPES[RECIPE_IDS[0]];
}

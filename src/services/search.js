import api from '../api';

/* Global search: recipes + users.

   Recipes can also be narrowed without any text at all — "every dessert under
   400 kcal" is a valid search with no words in it — so `q` is optional as long
   as something else is set. Users only ever match on name, so a filters-only
   search comes back with an empty `users`.

   `course` is a comma-separated list (the chips are checkboxes, not a radio);
   `kcalMax: 0` means no ceiling. */
export async function search(q, { course = [], meal = '', kcalMin = 0, kcalMax = 0 } = {}) {
  const { data } = await api.get('/search', {
    params: {
      q,
      course: Array.isArray(course) ? course.join(',') : course,
      meal,
      kcal_min: kcalMin,
      kcal_max: kcalMax,
    },
  });
  return data; // { recipes: [...], users: [...] }
}

/* The course vocabulary, straight from the backend. Fetched once; `lib/courses`
   is the mirror that paints before this answers. */
export async function getCourses() {
  const { data } = await api.get('/courses');
  return data; // { courses: [{id, name, meals}], meals: [...] }
}

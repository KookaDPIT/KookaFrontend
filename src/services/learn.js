import api from '../api';

/* Learn API — the honeycomb, its lessons, quizzes and the daily challenges.

   Quizzes are graded on the server: the options come down without the correct
   index, and only the chosen indices go back up. There is nothing here the
   browser could read to shortcut a lesson. */

export async function getTree() {
  const { data } = await api.get('/learn');
  return data; // { rank, ranks, branches, lessons, stats, challenges }
}

export async function getLesson(slug) {
  const { data } = await api.get(`/learn/lessons/${slug}`);
  return data;
}

/* answers: array of chosen option indices, one per question (null = skipped). */
export async function submitQuiz(slug, answers) {
  const { data } = await api.post(`/learn/lessons/${slug}/quiz`, { answers });
  return data; // { passed, score, total, xp_gained?, rank?, unlocked?, tree? }
}

export async function submitMastery(slug, answers) {
  const { data } = await api.post(`/learn/lessons/${slug}/mastery`, { answers });
  return data;
}

export async function getChallenges() {
  const { data } = await api.get('/learn/challenges');
  return data;
}

/* The 16-tier table. Static per deploy, so callers can cache it freely. */
export async function getRanks() {
  const { data } = await api.get('/learn/ranks');
  return data; // { tiers, ranks }
}

/* ---- admin ---- */
export async function adminListLessons() {
  const { data } = await api.get('/admin/lessons');
  return data;
}

export async function adminUpdateLesson(slug, payload) {
  const { data } = await api.patch(`/admin/lessons/${slug}`, payload);
  return data;
}

export async function adminResetLesson(slug) {
  const { data } = await api.post(`/admin/lessons/${slug}/reset`);
  return data;
}

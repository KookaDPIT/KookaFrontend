/* Rank palette, shared by the badge, the pill and anything else that needs to
   colour by rank. Kept in a plain module so the component file only exports
   components (which is what React Fast Refresh needs).

   Mirrors `services/ranks.py` on the backend — the API sends `rank_color` too,
   so these are the fallback and the source for the faded/shadow variants. */
export const RANK_COLORS = {
  copper: { vibrant: '#d74d34', faded: '#d9a8a0', shadow: '#a83722' },
  bronze: { vibrant: '#b8753d', faded: '#d4b5a0', shadow: '#8c5629' },
  silver: { vibrant: '#8b8882', faded: '#d5d0c8', shadow: '#6b6863' },
  gold: { vibrant: '#c9a632', faded: '#dcc793', shadow: '#9c7f1f' },
  platinum: { vibrant: '#4fa3c8', faded: '#d0e8f2', shadow: '#3b7d9b' },
  chef: { vibrant: '#d16ba8', faded: '#e6cde0', shadow: '#a44b81' },
};

/* The six recipe ranks in order — recipes use families without divisions. */
export const RECIPE_RANKS = [
  { id: 'copper', name: 'Copper' },
  { id: 'bronze', name: 'Bronze' },
  { id: 'silver', name: 'Silver' },
  { id: 'gold', name: 'Gold' },
  { id: 'platinum', name: 'Platinum' },
  { id: 'chef', name: 'Chef' },
];

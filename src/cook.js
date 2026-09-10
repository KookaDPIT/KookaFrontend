import { useEffect, useState } from 'react';

/* ==========================================================================
   Cook session — the recipe you are in the middle of making.

   Cooking used to be a trap: once you were on /recipe/:id/cook the only ways
   out were finishing or losing your place. The session lives here instead of
   in the Cook page's state, so you can walk off to the forum, come back, and
   still be on step 4 with the pasta timer running.

   Backed by localStorage and broadcast on a window event, the same pattern as
   settings.js and user.js. The timer stores an absolute `endsAt` rather than a
   remaining count, so it keeps ticking honestly while the page is unmounted —
   a countdown stored as "seconds left" silently pauses the moment you leave.
   ========================================================================== */

const KEY = 'kooka_cook';
const EVENT = 'kooka:cook';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(session) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage may be unavailable — the page still works, it just forgets */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: session }));
  return session;
}

/* "M:SS", "MM:SS" or "H:MM:SS" → seconds */
export function parseTimer(str) {
  if (!str) return 0;
  const parts = String(str).split(':').map((n) => parseInt(n, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export function formatTimer(total) {
  const s = Math.max(0, Math.round(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/* Seconds left right now. A running timer is derived from `endsAt`, so time
   passes at the same rate whether or not anyone is watching. */
export function timerRemaining(timer) {
  if (!timer) return 0;
  if (!timer.running) return Math.max(0, timer.remaining ?? timer.total ?? 0);
  return Math.max(0, Math.round(((timer.endsAt || 0) - Date.now()) / 1000));
}

export function readCook() {
  return read();
}

/* Start (or switch to) a recipe. Opening a different recipe replaces the
   session — you can only be at one stove. */
export function startCook(recipe) {
  const current = read();
  if (current && current.recipeId === recipe.id) return current;
  return write({
    recipeId: recipe.id,
    title: recipe.title || '',
    image: recipe.image_url || '',
    totalSteps: (recipe.steps || []).length,
    stepIndex: 0,
    startedAt: Date.now(),
    timer: null,
  });
}

export function updateCook(patch) {
  const current = read();
  if (!current) return null;
  return write({ ...current, ...patch });
}

/* Finished, or gave up. Same call either way — the difference is only that a
   forfeit never reached the "I cooked it" check, so no XP was ever awarded. */
export function endCook() {
  return write(null);
}

// ---------- timer ----------

/* Load a step's timer without starting it, and only when it actually changes:
   re-seeding on every render would reset a countdown mid-boil. */
export function armTimer(spec, label = '', stepIndex = 0) {
  const current = read();
  if (!current) return null;
  const total = parseTimer(spec);
  if (!total) {
    return current.timer ? write({ ...current, timer: null }) : current;
  }
  /* Keyed by the step, not just the duration: two steps can both say "5:00",
     and matching on the spec alone would carry a half-spent countdown from one
     into the other. */
  if (current.timer && current.timer.spec === spec && current.timer.step === stepIndex) {
    return current;
  }
  return write({
    ...current,
    timer: {
      spec, label, total, step: stepIndex,
      remaining: total, running: false, endsAt: null,
    },
  });
}

export function toggleTimer() {
  const current = read();
  if (!current?.timer) return current;
  const t = current.timer;
  if (t.running) {
    return write({
      ...current,
      timer: { ...t, running: false, remaining: timerRemaining(t), endsAt: null },
    });
  }
  const remaining = Math.max(0, t.remaining ?? t.total);
  if (remaining <= 0) return current;
  return write({
    ...current,
    timer: { ...t, running: true, remaining, endsAt: Date.now() + remaining * 1000 },
  });
}

export function resetTimer() {
  const current = read();
  if (!current?.timer) return current;
  return write({
    ...current,
    timer: { ...current.timer, running: false, remaining: current.timer.total, endsAt: null },
  });
}

/* Subscribe. Re-renders on every session change and, while a timer runs, once
   a second so the readout counts down. */
export function useCookSession() {
  const [session, setSession] = useState(read);

  useEffect(() => {
    const onChange = (e) => setSession(e.detail ?? read());
    window.addEventListener(EVENT, onChange);
    // another tab may be cooking the same recipe
    const onStorage = (e) => {
      if (e.key === KEY) setSession(read());
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const running = !!session?.timer?.running;
  useEffect(() => {
    if (!running) return undefined;
    const id = window.setInterval(() => {
      const current = read();
      // A finished countdown has to be written back, not just displayed as 0:
      // otherwise it "restarts" the moment the tab wakes up and `endsAt` is
      // recomputed against a much later `Date.now()`.
      if (current?.timer?.running && timerRemaining(current.timer) <= 0) {
        setSession(write({
          ...current,
          timer: { ...current.timer, running: false, remaining: 0, endsAt: null },
        }));
        return;
      }
      setSession(current ? { ...current } : null);
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  return session;
}

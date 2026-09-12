import { useEffect, useState } from 'react';
import api from './api';
import i18n from './i18n';
import { hydrateFromUser, applyTheme } from './settings';

/* ==========================================================================
   Shared current-user store. Backed by localStorage ('kooka_user') and kept
   fresh from GET /me. Mirrors the settings.js pub/sub pattern so every mounted
   useUser() subscriber stays in sync after login / profile edits / logout.
   ========================================================================== */

const KEY = 'kooka_user';
const TOKEN_KEY = 'kooka_token';
const EVENT = 'kooka:user';
const ALLERGY_ANSWERED_KEY = 'kooka_allergies_answered';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(user) {
  try {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage may be unavailable */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: user }));
}

/* Is the stored token still good?

   Presence alone used to be the test, so an expired token let the app render,
   fire a request, take a 401 and only then bounce you to the login screen —
   a visible flash of an app you were not signed into. Reading `exp` out of the
   JWT settles it before the first paint.

   This is convenience, never access control: the signature is not checked here
   and could not be. Every endpoint re-validates the token server-side. */
function tokenIsLive(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // `exp` is in seconds; a token without one is treated as non-expiring
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch {
    // unreadable token — let the backend be the judge rather than locking out
    return true;
  }
}

export function isLoggedIn() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  if (tokenIsLive(token)) return true;
  // stale: clear it so nothing downstream keeps retrying with it
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(KEY);
  } catch { /* storage may be unavailable */ }
  return false;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  write(null);
}

export function markAllergiesAnswered() {
  try {
    localStorage.setItem(ALLERGY_ANSWERED_KEY, 'true');
  } catch {
    /* the account data remains authoritative when storage is unavailable */
  }
}

export function allergiesHaveBeenAnswered() {
  try {
    return localStorage.getItem(ALLERGY_ANSWERED_KEY) === 'true';
  } catch {
    return false;
  }
}

/* Fetch the live profile from the backend and cache it. */
export async function refreshUser() {
  if (!isLoggedIn()) return null;
  try {
    const { data } = await api.get('/me');
    write(data);
    // keep the shared settings store, theme and language in sync with the
    // authoritative backend account so Profile + Settings reflect it everywhere.
    hydrateFromUser(data);
    if (data?.theme) applyTheme(data.theme);
    if (data?.language && !i18n.language?.startsWith(data.language)) {
      i18n.changeLanguage(data.language);
    }
    return data;
  } catch (err) {
    // 401 → token dead: clear it so guards send the user back to login.
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      logout();
    }
    return null;
  }
}

export function useUser() {
  const [user, setUser] = useState(read);

  useEffect(() => {
    const onChange = (e) => setUser(e.detail ?? read());
    window.addEventListener(EVENT, onChange);
    // pull a fresh copy on mount if we have a token but no cached user yet
    if (isLoggedIn() && !read()) refreshUser();
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  return [user, { refresh: refreshUser, logout, set: write }];
}

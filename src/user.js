import { useEffect, useState } from 'react';
import api from './api';

/* ==========================================================================
   Shared current-user store. Backed by localStorage ('kooka_user') and kept
   fresh from GET /me. Mirrors the settings.js pub/sub pattern so every mounted
   useUser() subscriber stays in sync after login / profile edits / logout.
   ========================================================================== */

const KEY = 'kooka_user';
const TOKEN_KEY = 'kooka_token';
const EVENT = 'kooka:user';

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

export function isLoggedIn() {
  return !!localStorage.getItem(TOKEN_KEY);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  write(null);
}

/* Fetch the live profile from the backend and cache it. */
export async function refreshUser() {
  if (!isLoggedIn()) return null;
  try {
    const { data } = await api.get('/me');
    write(data);
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

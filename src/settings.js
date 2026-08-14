import { useEffect, useState } from 'react';

/* ==========================================================================
   Shared client settings — a tiny localStorage-backed store so the profile
   header and the settings screen stay in sync. Writes broadcast a window event
   that every mounted useSettings() subscriber picks up. A backend can later
   replace read()/write() with API calls.
   ========================================================================== */

const KEY = 'kooka_settings';
const EVENT = 'kooka:settings';

export const DEFAULT_SETTINGS = {
  name: 'Alex Marin',
  username: 'searsalot',
  email: 'alex@kooka.app',
  bio: '', // empty → the profile falls back to the translated default
  avatar: '', // avatar image URL (empty → initials)
  cover: '', // profile background/cover image URL
  privateAccount: false,
  activityStatus: true,
  allowTagging: true,
  publicPassport: true,
  messagesFrom: 'followers', // everyone | followers | none
  notif: { followers: true, comments: true, forum: true, digest: false, daily: true },
  theme: 'system', // system | light | dark
  language: 'en', // en | ro — mirrors i18n, persisted server-side
  twoFactor: false,
};

/* The subset of settings the backend stores as an opaque JSON blob (there are
   no dedicated columns for these client preferences). Kept in sync via the
   `settings` field of PATCH /me. */
export const CLIENT_PREF_KEYS = [
  'privateAccount',
  'activityStatus',
  'allowTagging',
  'publicPassport',
  'messagesFrom',
  'notif',
  'twoFactor',
];

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      notif: { ...DEFAULT_SETTINGS.notif, ...(parsed.notif || {}) },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function write(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage may be unavailable — keep working in memory */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
}

/* Map a GET /me response onto the settings shape. Only fields the backend
   actually returned override what we already have, so a partial response never
   wipes local preferences. */
export function mapUserToSettings(user) {
  if (!user) return {};
  const mapped = {};
  if (user.full_name != null) mapped.name = user.full_name;
  if (user.username != null) mapped.username = user.username;
  if (user.email != null) mapped.email = user.email;
  if (user.bio != null) mapped.bio = user.bio;
  if (user.avatar_url != null) mapped.avatar = user.avatar_url;
  if (user.cover_url != null) mapped.cover = user.cover_url;
  if (user.theme != null) mapped.theme = user.theme;
  if (user.language != null) mapped.language = user.language;
  // the client-preference blob (privacy, notifications, …)
  if (user.settings && typeof user.settings === 'object') {
    Object.assign(mapped, user.settings);
  }
  return mapped;
}

/* Merge a fresh backend user into the store (used after GET /me). */
export function hydrateFromUser(user) {
  const mapped = mapUserToSettings(user);
  if (Object.keys(mapped).length === 0) return read();
  const base = read();
  const next = {
    ...base,
    ...mapped,
    notif: { ...base.notif, ...(mapped.notif || {}) },
  };
  write(next);
  return next;
}

/* Serialize the client-only preference subset for the PATCH /me `settings` field. */
export function settingsBlob(s) {
  const blob = {};
  for (const key of CLIENT_PREF_KEYS) blob[key] = s[key];
  return JSON.stringify(blob);
}

/* apply the chosen theme to the document (system falls back to the OS scheme) */
export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
    root.style.colorScheme = 'light dark';
  } else {
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
  }
}

export function useSettings() {
  const [settings, setLocal] = useState(read);

  useEffect(() => {
    const onChange = (e) => setLocal(e.detail || read());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const update = (patch) => {
    const base = read();
    const next = typeof patch === 'function' ? patch(base) : { ...base, ...patch };
    write(next);
    setLocal(next);
  };

  return [settings, update];
}

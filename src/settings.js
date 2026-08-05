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
  privateAccount: false,
  activityStatus: true,
  allowTagging: true,
  publicPassport: true,
  messagesFrom: 'followers', // everyone | followers | none
  notif: { followers: true, comments: true, forum: true, digest: false, daily: true },
  theme: 'system', // system | light | dark
  twoFactor: false,
};

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

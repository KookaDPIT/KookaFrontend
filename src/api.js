import axios from 'axios';

/**
 * Central axios instance for talking to the Kooka backend.
 *
 * Base URL comes from VITE_API_URL:
 *   - .env.local  -> http://localhost:8000        (local dev)
 *   - .env        -> https://kookabackend.onrender.com  (deployed)
 *
 * Usage anywhere in the app:
 *   import api from './api';           // adjust the relative path
 *   api.get('/health').then((res) => console.log(res.data));
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the saved auth token (if any) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kooka_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

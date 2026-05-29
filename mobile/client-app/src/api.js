import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// URL de l'API (plateforme Next.js). En émulateur Android, 10.0.2.2 = localhost de la machine.
// En production : remplacer par l'URL Vercel (https://votre-app.vercel.app/api).
export const API_BASE =
  Constants.expoConfig?.extra?.apiBaseUrl || 'http://10.0.2.2:3000/api';

let token = null;

export async function loadToken() {
  token = await AsyncStorage.getItem('mw_token');
  return token;
}
export async function saveSession(t, user) {
  token = t;
  await AsyncStorage.setItem('mw_token', t);
  await AsyncStorage.setItem('mw_user', JSON.stringify(user));
}
export async function getUser() {
  const raw = await AsyncStorage.getItem('mw_user');
  return raw ? JSON.parse(raw) : null;
}
export async function logout() {
  token = null;
  await AsyncStorage.multiRemove(['mw_token', 'mw_user']);
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

import * as Location from 'expo-location';
import { api } from './api';

// Partage GPS du livreur. Envoie la position au serveur toutes les ~10s
// tant que le livreur est "en service". Diffusé en temps réel via Pusher côté serveur.
let watcher = null;

export async function startSharing() {
  if (watcher) return true;
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return false;

  watcher = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 30 },
    async (loc) => {
      try {
        await api('/drivers/location', {
          method: 'POST',
          body: { lat: loc.coords.latitude, lng: loc.coords.longitude, heading: loc.coords.heading },
        });
      } catch (e) {}
    }
  );
  return true;
}

export function stopSharing() {
  if (watcher) { watcher.remove(); watcher = null; }
}

import { StyleSheet } from 'react-native';

export const C = {
  primary: '#1a1a2e',
  accent: '#e94560',
  bg: '#f5f6f8',
  card: '#ffffff',
  text: '#1a1a2e',
  muted: '#888',
  border: '#e6e6e6',
  green: '#0a9d6e',
};

export const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  h1: { fontSize: 26, fontWeight: '800', color: C.text },
  h2: { fontSize: 18, fontWeight: '700', color: C.text },
  muted: { color: C.muted },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, marginVertical: 6, fontSize: 15 },
  btn: { backgroundColor: C.primary, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, padding: 13, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { backgroundColor: C.accent, color: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden', fontSize: 12, fontWeight: '700' },
});

export const STATUS_LABELS = {
  pending_restaurant: 'En attente de validation',
  preparing: 'En préparation 👨‍🍳',
  driver_assigned: 'Livreur assigné 🛵',
  going_to_restaurant: 'Livreur en route vers le resto 🛵',
  picked_up: 'Commande récupérée 📦',
  delivering: 'En cours de livraison 🚗',
  delivered: 'Livrée ✅',
  cancelled: 'Annulée ❌',
};

export const STATUS_STEPS = [
  'preparing', 'driver_assigned', 'going_to_restaurant', 'picked_up', 'delivering', 'delivered',
];

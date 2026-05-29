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
  blue: '#2d6cdf',
};

export const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  h1: { fontSize: 26, fontWeight: '800', color: C.text },
  h2: { fontSize: 18, fontWeight: '700', color: C.text },
  muted: { color: C.muted },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, marginVertical: 6, fontSize: 15 },
  btn: { backgroundColor: C.primary, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

export const STATUS_LABELS = {
  pending_restaurant: 'À valider (resto)',
  preparing: 'En préparation — à dispatcher',
  driver_assigned: 'Livreur assigné',
  going_to_restaurant: 'En route vers resto',
  picked_up: 'Récupérée',
  delivering: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export const DELIVERY_FEES = [10, 15, 20, 25, 30, 35, 40, 45, 50];

// Prochaine action du livreur selon le statut courant.
export const DRIVER_NEXT = {
  driver_assigned: { next: 'going_to_restaurant', label: '🛵 Partir vers le restaurant' },
  going_to_restaurant: { next: 'picked_up', label: '📦 Commande récupérée' },
  picked_up: { next: 'delivering', label: '🚗 Démarrer la livraison' },
  delivering: { next: 'delivered', label: '✅ Marquer comme livrée' },
};

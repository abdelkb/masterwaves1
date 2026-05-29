import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { S, C, STATUS_LABELS, DELIVERY_FEES } from '../theme';

export default function DispatchScreen() {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [modal, setModal] = useState(null); // order en cours de dispatch
  const [fee, setFee] = useState(null);
  const [driverId, setDriverId] = useState(null);

  const load = useCallback(() => {
    api('/orders').then((d) => setOrders(d.orders)).catch(() => {});
    api('/drivers').then((d) => setDrivers(d.drivers)).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => { load(); const t = setInterval(load, 7000); return () => clearInterval(t); }, [load]));

  function openDispatch(order) { setModal(order); setFee(null); setDriverId(null); }

  async function dispatch() {
    if (!fee || !driverId) { Alert.alert('Incomplet', 'Choisissez un prix et un livreur.'); return; }
    try {
      await api(`/orders/${modal.id}/assign`, { method: 'POST', body: { driver_id: driverId, delivery_fee: fee } });
      setModal(null); load();
    } catch (e) { Alert.alert('Erreur', e.message); }
  }

  async function cancel(order) {
    Alert.alert('Annuler', `Annuler la commande #${order.id} ?`, [
      { text: 'Non' },
      { text: 'Oui', style: 'destructive', onPress: async () => {
        try { await api(`/orders/${order.id}/cancel`, { method: 'POST', body: { reason: 'Annulée par le gérant' } }); load(); }
        catch (e) { Alert.alert('Erreur', e.message); }
      } },
    ]);
  }

  return (
    <View style={S.screen}>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={orders}
        keyExtractor={(o) => String(o.id)}
        ListHeaderComponent={<Text style={[S.h1, { marginBottom: 8 }]}>Commandes</Text>}
        ListEmptyComponent={<Text style={S.muted}>Aucune commande.</Text>}
        renderItem={({ item }) => (
          <View style={S.card}>
            <View style={S.row}>
              <Text style={S.h2}>#{item.id} · {item.restaurant_name}</Text>
              <Text>{item.items_total} DH</Text>
            </View>
            <Text style={{ color: C.accent, marginVertical: 4 }}>{STATUS_LABELS[item.status]}</Text>
            <Text style={S.muted}>{item.client_name || 'Client'} · {item.client_phone || '—'}</Text>
            <Text style={S.muted}>📍 {item.delivery_address}</Text>
            {item.driver_name && <Text style={{ color: C.blue }}>🛵 {item.driver_name}</Text>}

            {item.status === 'pending_restaurant' && (
              <Text style={[S.muted, { marginTop: 6 }]}>En attente de validation du restaurant…</Text>
            )}
            {item.status === 'preparing' && (
              <TouchableOpacity style={S.btn} onPress={() => openDispatch(item)}>
                <Text style={S.btnText}>Définir prix & dispatcher</Text>
              </TouchableOpacity>
            )}
            {!['delivered', 'cancelled'].includes(item.status) && (
              <TouchableOpacity style={[S.btnGhost, { borderColor: C.accent }]} onPress={() => cancel(item)}>
                <Text style={{ color: C.accent, fontWeight: '700' }}>Annuler</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <Modal visible={!!modal} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.4)' }}>
          <ScrollView style={{ maxHeight: '85%', backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 }} contentContainerStyle={{ padding: 20 }}>
            <Text style={S.h1}>Dispatcher #{modal?.id}</Text>
            <Text style={[S.h2, { marginTop: 12 }]}>Prix de livraison</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {DELIVERY_FEES.map((f) => (
                <TouchableOpacity key={f} onPress={() => setFee(f)}
                  style={[S.btnGhost, { marginTop: 0, paddingHorizontal: 16, backgroundColor: fee === f ? C.primary : '#fff' }]}>
                  <Text style={{ color: fee === f ? '#fff' : C.text, fontWeight: '700' }}>{f} DH</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[S.h2, { marginTop: 16 }]}>Livreur</Text>
            {drivers.map((d) => (
              <TouchableOpacity key={d.id} onPress={() => d.is_active && setDriverId(d.id)}
                style={[S.card, { marginTop: 8, opacity: d.is_active ? 1 : 0.4, borderColor: driverId === d.id ? C.primary : C.border, borderWidth: driverId === d.id ? 2 : 1 }]}>
                <Text style={{ fontWeight: '700' }}>{d.full_name} {d.is_active ? '' : '(inactif)'}</Text>
                <Text style={S.muted}>{d.active_orders} livraison(s) en cours</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[S.btn, { marginTop: 16 }]} onPress={dispatch}>
              <Text style={S.btnText}>Confirmer le dispatch</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.btnGhost} onPress={() => setModal(null)}>
              <Text style={{ fontWeight: '700' }}>Fermer</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

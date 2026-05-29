import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Switch, Linking, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { startSharing, stopSharing } from '../location';
import { S, C, STATUS_LABELS, DRIVER_NEXT } from '../theme';

// Le livreur gère PLUSIEURS commandes à la fois.
export default function DeliveriesScreen() {
  const [orders, setOrders] = useState([]);
  const [online, setOnline] = useState(false);

  const load = useCallback(() => {
    api('/orders').then((d) =>
      setOrders(d.orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)))
    ).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => { load(); const t = setInterval(load, 7000); return () => clearInterval(t); }, [load]));

  async function toggleOnline(v) {
    if (v) { const ok = await startSharing(); if (!ok) { Alert.alert('Permission requise', 'Activez la localisation.'); return; } }
    else stopSharing();
    setOnline(v);
  }

  async function advance(order) {
    const step = DRIVER_NEXT[order.status];
    if (!step) return;
    try { await api(`/orders/${order.id}/status`, { method: 'POST', body: { status: step.next } }); load(); }
    catch (e) { Alert.alert('Erreur', e.message); }
  }

  function navigate(order) {
    // Vers le resto si pas encore récupéré, sinon vers le client.
    const goingToResto = ['driver_assigned', 'going_to_restaurant'].includes(order.status);
    const lat = goingToResto ? order.restaurant_lat : order.delivery_lat;
    const lng = goingToResto ? order.restaurant_lng : order.delivery_lng;
    const q = lat && lng ? `${lat},${lng}` : encodeURIComponent(order.delivery_address);
    const url = Platform.select({
      ios: `maps://?daddr=${q}`,
      android: `google.navigation:q=${q}`,
    });
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${q}`));
  }

  return (
    <View style={S.screen}>
      <View style={[S.row, { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: C.border }]}>
        <Text style={S.h2}>{online ? '🟢 En service' : '⚪ Hors service'}</Text>
        <Switch value={online} onValueChange={toggleOnline} />
      </View>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={orders}
        keyExtractor={(o) => String(o.id)}
        ListHeaderComponent={<Text style={[S.h1, { marginBottom: 8 }]}>Mes livraisons ({orders.length})</Text>}
        ListEmptyComponent={<Text style={S.muted}>Aucune livraison assignée.</Text>}
        renderItem={({ item }) => {
          const step = DRIVER_NEXT[item.status];
          const goingToResto = ['driver_assigned', 'going_to_restaurant'].includes(item.status);
          return (
            <View style={S.card}>
              <View style={S.row}>
                <Text style={S.h2}>#{item.id} · {item.restaurant_name}</Text>
                <Text style={{ color: C.blue, fontWeight: '700' }}>{item.total} DH</Text>
              </View>
              <Text style={{ color: C.accent, marginVertical: 4 }}>{STATUS_LABELS[item.status]}</Text>
              <Text style={S.muted}>{goingToResto ? '➡️ Aller au restaurant' : '➡️ Livrer au client'}</Text>
              <Text>📍 {goingToResto ? item.restaurant_name : item.delivery_address}</Text>
              {!goingToResto && <Text style={S.muted}>{item.client_name} · {item.client_phone}</Text>}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[S.btnGhost, { flex: 1 }]} onPress={() => navigate(item)}>
                  <Text style={{ fontWeight: '700' }}>🧭 Naviguer</Text>
                </TouchableOpacity>
                {step && (
                  <TouchableOpacity style={[S.btn, { flex: 2, marginTop: 8 }]} onPress={() => advance(item)}>
                    <Text style={S.btnText}>{step.label}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { api } from '../api';
import { S, C, STATUS_LABELS, STATUS_STEPS } from '../theme';

export default function TrackingScreen({ route }) {
  const { orderId } = route.params;
  const [data, setData] = useState(null);
  const timer = useRef(null);

  async function load() {
    try { setData(await api(`/orders/${orderId}`)); } catch (e) {}
  }
  useEffect(() => {
    load();
    timer.current = setInterval(load, 5000);
    return () => clearInterval(timer.current);
  }, [orderId]);

  if (!data) return <View style={S.screen}><Text style={S.pad}>Chargement…</Text></View>;
  const { order, items, driverLocation } = data;

  const dropLat = order.delivery_lat || order.restaurant_lat || 33.5731;
  const dropLng = order.delivery_lng || order.restaurant_lng || -7.5898;
  const stepIndex = STATUS_STEPS.indexOf(order.status);

  async function cancel() {
    try {
      await api(`/orders/${orderId}/cancel`, { method: 'POST', body: { reason: 'Annulée par le client' } });
      load();
    } catch (e) { Alert.alert('Annulation impossible', e.message); }
  }

  return (
    <ScrollView style={S.screen}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ height: 280 }}
        initialRegion={{ latitude: dropLat, longitude: dropLng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
        <Marker coordinate={{ latitude: dropLat, longitude: dropLng }} title="Livraison" pinColor={C.accent} />
        {order.restaurant_lat && (
          <Marker coordinate={{ latitude: order.restaurant_lat, longitude: order.restaurant_lng }} title={order.restaurant_name} pinColor="#1a1a2e" />
        )}
        {driverLocation && (
          <Marker coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }} title="Livreur 🛵" />
        )}
      </MapView>

      <View style={S.pad}>
        <Text style={S.h1}>Commande #{order.id}</Text>
        <Text style={{ fontSize: 18, color: C.accent, fontWeight: '700', marginBottom: 12 }}>
          {STATUS_LABELS[order.status]}
        </Text>

        {order.status !== 'cancelled' && (
          <View style={S.card}>
            {STATUS_STEPS.map((s, i) => (
              <View key={s} style={[S.row, { marginBottom: 8, opacity: i <= stepIndex ? 1 : 0.35 }]}>
                <Text>{i <= stepIndex ? '✅' : '⬜'} {STATUS_LABELS[s]}</Text>
              </View>
            ))}
          </View>
        )}

        {!!order.driver_name && (
          <View style={S.card}>
            <Text style={S.h2}>Votre livreur</Text>
            <Text>{order.driver_name} · {order.driver_phone || ''}</Text>
          </View>
        )}

        <View style={S.card}>
          <Text style={S.h2}>Détail</Text>
          {items.map((it) => <Text key={it.id}>{it.quantity}× {it.name}</Text>)}
          <Text style={{ marginTop: 6 }}>Articles : {order.items_total} DH</Text>
          {order.delivery_fee != null && <Text>Livraison : {order.delivery_fee} DH</Text>}
          <Text style={{ fontWeight: '700' }}>Total : {order.total} DH</Text>
        </View>

        {order.status === 'pending_restaurant' && (
          <TouchableOpacity style={[S.btnGhost, { borderColor: C.accent }]} onPress={cancel}>
            <Text style={{ color: C.accent, fontWeight: '700' }}>Annuler la commande</Text>
          </TouchableOpacity>
        )}
        {['preparing', 'driver_assigned', 'going_to_restaurant', 'picked_up', 'delivering'].includes(order.status) && (
          <Text style={[S.muted, { textAlign: 'center', marginTop: 8 }]}>
            Commande en préparation : pour annuler, appelez le service. ☎️
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

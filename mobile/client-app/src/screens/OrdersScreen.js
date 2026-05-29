import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { S, C, STATUS_LABELS } from '../theme';

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);

  const load = useCallback(() => {
    api('/orders').then((d) => setOrders(d.orders)).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function rate(order) {
    Alert.alert('Noter', `Donner 5★ au restaurant et au livreur pour la commande #${order.id} ?`, [
      { text: 'Annuler' },
      { text: 'Oui', onPress: async () => {
        try { await api('/ratings', { method: 'POST', body: { order_id: order.id, restaurant_score: 5, driver_score: 5 } }); Alert.alert('Merci !'); }
        catch (e) { Alert.alert('Erreur', e.message); }
      } },
    ]);
  }

  return (
    <FlatList
      style={S.screen}
      contentContainerStyle={{ padding: 16 }}
      data={orders}
      keyExtractor={(o) => String(o.id)}
      ListHeaderComponent={<Text style={[S.h1, { marginBottom: 12 }]}>Mes commandes</Text>}
      ListEmptyComponent={<Text style={S.muted}>Aucune commande.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={S.card} onPress={() => navigation.navigate('Tracking', { orderId: item.id })}>
          <View style={S.row}>
            <Text style={S.h2}>#{item.id} · {item.restaurant_name}</Text>
            <Text>{item.total} DH</Text>
          </View>
          <Text style={{ color: C.accent }}>{STATUS_LABELS[item.status]}</Text>
          {item.status === 'delivered' && (
            <TouchableOpacity onPress={() => rate(item)} style={{ marginTop: 6 }}>
              <Text style={{ color: C.primary, fontWeight: '700' }}>★ Noter</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}
    />
  );
}

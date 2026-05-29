import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { api } from '../api';
import { useCart } from '../cart';
import { S, C } from '../theme';

export default function CheckoutScreen({ route, navigation }) {
  const { address } = route.params;
  const cart = useCart();
  const [payment, setPayment] = useState('cash');
  const [submitting, setSubmitting] = useState(false);

  async function placeOrder() {
    setSubmitting(true);
    try {
      const { id } = await api('/orders', { method: 'POST', body: {
        restaurant_id: cart.restaurantId,
        items: cart.items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        delivery_address: address.formatted,
        delivery_details: address.details,
        delivery_note: address.note,
        delivery_lat: address.lat,
        delivery_lng: address.lng,
        payment_method: payment,
      } });
      cart.clear();
      navigation.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'Tracking', params: { orderId: id } }] });
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setSubmitting(false); }
  }

  return (
    <ScrollView style={S.screen} contentContainerStyle={S.pad}>
      <Text style={S.h1}>Récapitulatif</Text>
      <View style={S.card}>
        {cart.items.map((i) => (
          <View key={i.product.id} style={[S.row, { marginBottom: 6 }]}>
            <Text>{i.quantity}× {i.product.name}</Text>
            <Text>{i.product.price * i.quantity} DH</Text>
          </View>
        ))}
        <View style={[S.row, { borderTopWidth: 1, borderColor: C.border, paddingTop: 8, marginTop: 4 }]}>
          <Text style={{ fontWeight: '700' }}>Sous-total</Text>
          <Text style={{ fontWeight: '700' }}>{cart.total} DH</Text>
        </View>
        <Text style={[S.muted, { fontSize: 12, marginTop: 4 }]}>
          Frais de livraison fixés par le gérant après validation.
        </Text>
      </View>

      <Text style={S.h2}>Adresse</Text>
      <View style={S.card}>
        <Text style={{ fontWeight: '700' }}>{address.label || 'Livraison'}</Text>
        <Text style={S.muted}>{address.formatted}</Text>
        {!!address.details && <Text style={S.muted}>{address.details}</Text>}
        {!!address.note && <Text style={S.muted}>📝 {address.note}</Text>}
      </View>

      <Text style={S.h2}>Paiement</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[['cash', '💵 Espèces à la livraison'], ['cmi', '💳 Carte (CMI)']].map(([k, l]) => (
          <TouchableOpacity key={k} onPress={() => setPayment(k)}
            style={[S.btnGhost, { flex: 1, backgroundColor: payment === k ? C.primary : '#fff' }]}>
            <Text style={{ color: payment === k ? '#fff' : C.text, fontWeight: '700', textAlign: 'center' }}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[S.btn, { marginTop: 20 }]} onPress={placeOrder} disabled={submitting}>
        <Text style={S.btnText}>{submitting ? 'Envoi…' : 'Confirmer la commande'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

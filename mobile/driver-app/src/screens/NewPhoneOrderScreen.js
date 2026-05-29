import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { api } from '../api';
import { S, C, DELIVERY_FEES } from '../theme';

// Le gérant crée une commande pour un client qui appelle par téléphone.
export default function NewPhoneOrderScreen({ navigation }) {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({}); // productId -> qty
  const [info, setInfo] = useState({ client_name: '', client_phone: '', delivery_address: '' });
  const [fee, setFee] = useState(null);

  useEffect(() => { api('/restaurants').then((d) => setRestaurants(d.restaurants)).catch(() => {}); }, []);

  async function pickRestaurant(r) {
    setRestaurant(r); setCart({});
    const d = await api(`/restaurants/${r.id}`);
    setProducts(d.products);
  }
  const inc = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id) => setCart((c) => { const n = { ...c }; n[id] = (n[id] || 0) - 1; if (n[id] <= 0) delete n[id]; return n; });

  const items = Object.entries(cart).map(([pid, qty]) => ({ product_id: Number(pid), quantity: qty }));

  async function submit() {
    if (!restaurant || !items.length) { Alert.alert('Incomplet', 'Choisissez un restaurant et des articles.'); return; }
    if (!info.delivery_address) { Alert.alert('Adresse requise', ''); return; }
    try {
      const { id } = await api('/orders', { method: 'POST', body: {
        restaurant_id: restaurant.id, items, ...info, delivery_fee: fee || undefined,
      } });
      Alert.alert('Commande créée', `Commande #${id} créée. Dispatchez-la depuis l'onglet Commandes.`);
      navigation.goBack();
    } catch (e) { Alert.alert('Erreur', e.message); }
  }

  return (
    <ScrollView style={S.screen} contentContainerStyle={S.pad}>
      <Text style={S.h1}>Commande téléphonique</Text>

      <Text style={[S.h2, { marginTop: 12 }]}>Restaurant</Text>
      {restaurants.map((r) => (
        <TouchableOpacity key={r.id} onPress={() => pickRestaurant(r)}
          style={[S.card, { borderWidth: restaurant?.id === r.id ? 2 : 1, borderColor: restaurant?.id === r.id ? C.primary : C.border }]}>
          <Text style={{ fontWeight: '700' }}>{r.name}</Text>
        </TouchableOpacity>
      ))}

      {!!products.length && (
        <>
          <Text style={[S.h2, { marginTop: 12 }]}>Articles</Text>
          {products.map((p) => (
            <View key={p.id} style={[S.card, S.row]}>
              <Text style={{ flex: 1 }}>{p.name} — {p.price} DH</Text>
              <View style={[S.row, { width: 90 }]}>
                <TouchableOpacity onPress={() => dec(p.id)}><Text style={qtyBtn}>−</Text></TouchableOpacity>
                <Text>{cart[p.id] || 0}</Text>
                <TouchableOpacity onPress={() => inc(p.id)}><Text style={qtyBtn}>+</Text></TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      <Text style={[S.h2, { marginTop: 12 }]}>Client</Text>
      <TextInput style={S.input} placeholder="Nom du client" value={info.client_name} onChangeText={(v) => setInfo({ ...info, client_name: v })} />
      <TextInput style={S.input} placeholder="Téléphone" keyboardType="phone-pad" value={info.client_phone} onChangeText={(v) => setInfo({ ...info, client_phone: v })} />
      <TextInput style={S.input} placeholder="Adresse de livraison" value={info.delivery_address} onChangeText={(v) => setInfo({ ...info, delivery_address: v })} multiline />

      <Text style={[S.h2, { marginTop: 12 }]}>Prix de livraison (optionnel ici)</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {DELIVERY_FEES.map((f) => (
          <TouchableOpacity key={f} onPress={() => setFee(fee === f ? null : f)}
            style={[S.btnGhost, { marginTop: 0, paddingHorizontal: 14, backgroundColor: fee === f ? C.primary : '#fff' }]}>
            <Text style={{ color: fee === f ? '#fff' : C.text }}>{f} DH</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[S.btn, { marginTop: 16 }]} onPress={submit}>
        <Text style={S.btnText}>Créer la commande</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const qtyBtn = { fontSize: 24, fontWeight: '700', width: 30, textAlign: 'center', color: '#1a1a2e' };

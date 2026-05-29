import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { api } from '../api';
import { useCart } from '../cart';
import { S, C } from '../theme';

export default function MenuScreen({ route, navigation }) {
  const { restaurant } = route.params;
  const [products, setProducts] = useState([]);
  const cart = useCart();

  useEffect(() => {
    navigation.setOptions({ title: restaurant.name });
    api(`/restaurants/${restaurant.id}`).then((d) => setProducts(d.products)).catch(() => {});
  }, [restaurant.id]);

  return (
    <View style={S.screen}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        data={products}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => {
          const inCart = cart.items.find((i) => i.product.id === item.id);
          return (
            <View style={S.card}>
              <View style={S.row}>
                <View style={{ flex: 1 }}>
                  <Text style={S.h2}>{item.name}</Text>
                  <Text style={S.muted}>{item.description}</Text>
                  <Text style={{ fontWeight: '700', marginTop: 4 }}>{item.price} DH</Text>
                </View>
                {item.in_stock ? (
                  inCart ? (
                    <View style={[S.row, { width: 96 }]}>
                      <TouchableOpacity onPress={() => cart.dec(item.id)}><Text style={qtyBtn}>−</Text></TouchableOpacity>
                      <Text style={{ fontWeight: '700' }}>{inCart.quantity}</Text>
                      <TouchableOpacity onPress={() => cart.add(item)}><Text style={qtyBtn}>+</Text></TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => cart.add(item)}><Text style={qtyBtn}>+</Text></TouchableOpacity>
                  )
                ) : <Text style={{ color: C.accent }}>Rupture</Text>}
              </View>
            </View>
          );
        }}
      />
      {cart.count > 0 && (
        <TouchableOpacity
          style={{ position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: C.accent, padding: 16, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between' }}
          onPress={() => navigation.navigate('Address')}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{cart.count} article(s)</Text>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Commander · {cart.total} DH</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const qtyBtn = { fontSize: 26, color: '#1a1a2e', fontWeight: '700', width: 32, textAlign: 'center' };

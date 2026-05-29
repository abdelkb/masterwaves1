import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { api } from '../api';
import { S, C } from '../theme';

export default function RestaurantsScreen({ navigation }) {
  const [list, setList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const { restaurants } = await api('/restaurants'); setList(restaurants); }
    catch (e) {}
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <FlatList
      style={S.screen}
      contentContainerStyle={{ padding: 16 }}
      data={list}
      keyExtractor={(r) => String(r.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      ListHeaderComponent={<Text style={[S.h1, { marginBottom: 12 }]}>Restaurants</Text>}
      ListEmptyComponent={<Text style={S.muted}>Aucun restaurant disponible.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={S.card} onPress={() => navigation.navigate('Menu', { restaurant: item })}>
          <View style={S.row}>
            <Text style={S.h2}>{item.name}</Text>
            <Text style={{ color: item.is_open ? C.green : C.accent }}>{item.is_open ? 'Ouvert' : 'Fermé'}</Text>
          </View>
          <Text style={S.muted}>{item.description || ''}</Text>
          <Text style={[S.muted, { fontSize: 12, marginTop: 4 }]}>📍 {item.address || ''}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

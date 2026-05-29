import React, { useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { S, C } from '../theme';

// Le gérant voit en temps réel la position de tous ses livreurs.
export default function DriversMapScreen() {
  const [locs, setLocs] = useState([]);

  const load = useCallback(() => {
    api('/drivers/location').then((d) => setLocs(d.locations)).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => { load(); const t = setInterval(load, 6000); return () => clearInterval(t); }, [load]));

  const center = locs[0]
    ? { latitude: locs[0].lat, longitude: locs[0].lng }
    : { latitude: 33.5731, longitude: -7.5898 };

  return (
    <View style={S.screen}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{ ...center, latitudeDelta: 0.08, longitudeDelta: 0.08 }}>
        {locs.map((l) => (
          <Marker key={l.driver_id}
            coordinate={{ latitude: l.lat, longitude: l.lng }}
            title={l.full_name}
            description={`Maj : ${l.updated_at}`} />
        ))}
      </MapView>
      <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: '#fff', padding: 10, borderRadius: 10 }}>
        <Text style={{ fontWeight: '700' }}>🛵 {locs.length} livreur(s) en ligne</Text>
      </View>
    </View>
  );
}

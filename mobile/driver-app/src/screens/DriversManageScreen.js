import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { S, C } from '../theme';

// Gestion des livreurs (réservée au gérant) : création + activation/désactivation.
export default function DriversManageScreen() {
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' });

  const load = useCallback(() => { api('/drivers').then((d) => setDrivers(d.drivers)).catch(() => {}); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function create() {
    if (!form.full_name || !form.email || !form.password) { Alert.alert('Incomplet', 'Nom, email et mot de passe requis.'); return; }
    try { await api('/drivers', { method: 'POST', body: form }); setForm({ full_name: '', email: '', phone: '', password: '' }); load(); }
    catch (e) { Alert.alert('Erreur', e.message); }
  }
  async function toggle(d) {
    try { await api(`/drivers/${d.id}`, { method: 'PATCH', body: { is_active: d.is_active ? 0 : 1 } }); load(); }
    catch (e) { Alert.alert('Erreur', e.message); }
  }

  return (
    <FlatList
      style={S.screen}
      contentContainerStyle={{ padding: 16 }}
      data={drivers}
      keyExtractor={(d) => String(d.id)}
      ListHeaderComponent={
        <View>
          <Text style={[S.h1, { marginBottom: 8 }]}>Livreurs</Text>
          <View style={S.card}>
            <Text style={S.h2}>Ajouter un livreur</Text>
            <TextInput style={S.input} placeholder="Nom complet" value={form.full_name} onChangeText={(v) => setForm({ ...form, full_name: v })} />
            <TextInput style={S.input} placeholder="Email" autoCapitalize="none" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} />
            <TextInput style={S.input} placeholder="Téléphone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
            <TextInput style={S.input} placeholder="Mot de passe" secureTextEntry value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} />
            <TouchableOpacity style={S.btn} onPress={create}><Text style={S.btnText}>Créer le compte livreur</Text></TouchableOpacity>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View style={[S.card, S.row]}>
          <View>
            <Text style={{ fontWeight: '700' }}>{item.full_name}</Text>
            <Text style={S.muted}>{item.email}</Text>
            <Text style={S.muted}>{item.active_orders} livraison(s) · {item.is_active ? 'actif' : 'inactif'}</Text>
          </View>
          <Switch value={!!item.is_active} onValueChange={() => toggle(item)} />
        </View>
      )}
    />
  );
}

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { api, saveSession } from '../api';
import { S, C } from '../theme';

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: 'client@masterwaves.ma', password: 'client123', full_name: '', phone: '' });
  const set = (k) => (v) => setForm({ ...form, [k]: v });

  async function submit() {
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const { token, user } = await api(path, { method: 'POST', body: form });
      await saveSession(token, user);
      onAuth(user);
    } catch (e) { Alert.alert('Erreur', e.message); }
  }

  return (
    <ScrollView style={S.screen} contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
      <Text style={{ fontSize: 34 }}>🌊</Text>
      <Text style={S.h1}>Master Waves</Text>
      <Text style={[S.muted, { marginBottom: 24 }]}>Livraison à domicile</Text>

      {mode === 'register' && (
        <>
          <TextInput style={S.input} placeholder="Nom complet" value={form.full_name} onChangeText={set('full_name')} />
          <TextInput style={S.input} placeholder="Téléphone" keyboardType="phone-pad" value={form.phone} onChangeText={set('phone')} />
        </>
      )}
      <TextInput style={S.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={set('email')} />
      <TextInput style={S.input} placeholder="Mot de passe" secureTextEntry value={form.password} onChangeText={set('password')} />

      <TouchableOpacity style={S.btn} onPress={submit}>
        <Text style={S.btnText}>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
        <Text style={{ color: C.accent }}>
          {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

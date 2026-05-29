import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { api, saveSession } from '../api';
import { S, C } from '../theme';

export default function AuthScreen({ onAuth }) {
  const [email, setEmail] = useState('driver@masterwaves.ma');
  const [password, setPassword] = useState('driver123');

  async function submit() {
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
      if (!['driver', 'manager', 'admin'].includes(user.role)) {
        Alert.alert('Accès refusé', 'Cette application est réservée aux livreurs et gérants.');
        return;
      }
      await saveSession(token, user);
      onAuth(user);
    } catch (e) { Alert.alert('Erreur', e.message); }
  }

  return (
    <View style={[S.screen, { padding: 24, paddingTop: 90 }]}>
      <Text style={{ fontSize: 34 }}>🛵</Text>
      <Text style={S.h1}>Master Waves Pro</Text>
      <Text style={[S.muted, { marginBottom: 24 }]}>Espace livreur & gérant</Text>
      <TextInput style={S.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={S.input} placeholder="Mot de passe" secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity style={S.btn} onPress={submit}><Text style={S.btnText}>Se connecter</Text></TouchableOpacity>
      <Text style={[S.muted, { marginTop: 20, fontSize: 12 }]}>
        Démo : driver@masterwaves.ma / driver123 · manager@masterwaves.ma / manager123
      </Text>
    </View>
  );
}

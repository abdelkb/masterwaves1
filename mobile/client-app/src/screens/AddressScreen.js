import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../api';
import { S, C } from '../theme';

// Étape 1 : choisir la source (GPS ou saisie).
// Étape 2 : confirmer/compléter MANUELLEMENT l'adresse (obligatoire), puis sauvegarder.
export default function AddressScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState([]);
  const [loadingGps, setLoadingGps] = useState(false);
  const [addr, setAddr] = useState({ formatted: '', details: '', note: '', label: 'Maison', lat: null, lng: null });

  useEffect(() => {
    api('/addresses').then((d) => setSaved(d.addresses)).catch(() => {});
  }, []);

  async function useCurrentLocation() {
    setLoadingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission refusée', 'Activez la localisation.'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      const [geo] = await Location.reverseGeocodeAsync(loc.coords);
      const formatted = geo ? [geo.street, geo.name, geo.city].filter(Boolean).join(', ') : '';
      setAddr((a) => ({ ...a, formatted, lat: loc.coords.latitude, lng: loc.coords.longitude }));
      setStep(2);
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setLoadingGps(false); }
  }

  function manualEntry() {
    setAddr((a) => ({ ...a, formatted: '', lat: null, lng: null }));
    setStep(2);
  }

  function chooseSaved(a) {
    navigation.navigate('Checkout', { address: a });
  }

  async function confirmAddress(save) {
    if (!addr.formatted.trim()) { Alert.alert('Adresse requise', 'Veuillez écrire votre adresse.'); return; }
    let finalAddr = { ...addr };
    if (save) {
      try {
        const { id } = await api('/addresses', { method: 'POST', body: { ...addr, is_default: saved.length === 0 } });
        finalAddr.id = id;
      } catch (e) {}
    }
    navigation.navigate('Checkout', { address: finalAddr });
  }

  if (step === 1) {
    return (
      <ScrollView style={S.screen} contentContainerStyle={S.pad}>
        <Text style={S.h1}>Adresse de livraison</Text>
        {saved.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={S.h2}>Mes adresses</Text>
            {saved.map((a) => (
              <TouchableOpacity key={a.id} style={S.card} onPress={() => chooseSaved(a)}>
                <Text style={{ fontWeight: '700' }}>{a.label} {a.is_default ? '⭐' : ''}</Text>
                <Text style={S.muted}>{a.formatted}</Text>
                {!!a.details && <Text style={S.muted}>{a.details}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={[S.h2, { marginTop: 16 }]}>Nouvelle adresse</Text>
        <TouchableOpacity style={S.btn} onPress={useCurrentLocation} disabled={loadingGps}>
          {loadingGps ? <ActivityIndicator color="#fff" /> : <Text style={S.btnText}>📍 Utiliser ma position actuelle</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={S.btnGhost} onPress={manualEntry}>
          <Text style={{ fontWeight: '700' }}>✍️ Saisir mon adresse</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Étape 2 — confirmation manuelle obligatoire
  return (
    <ScrollView style={S.screen} contentContainerStyle={S.pad}>
      <Text style={S.h1}>Confirmez votre adresse</Text>
      <Text style={[S.muted, { marginBottom: 8 }]}>
        Vérifiez et complétez manuellement pour éviter toute erreur de livraison.
      </Text>
      <Text style={S.h2}>Adresse</Text>
      <TextInput style={S.input} placeholder="Rue, numéro, quartier, ville" value={addr.formatted}
        onChangeText={(v) => setAddr({ ...addr, formatted: v })} multiline />
      <Text style={S.h2}>Détails (étage, appartement, porte)</Text>
      <TextInput style={S.input} placeholder="Ex: 3e étage, appt 7" value={addr.details}
        onChangeText={(v) => setAddr({ ...addr, details: v })} />
      <Text style={S.h2}>Indication pour le livreur</Text>
      <TextInput style={S.input} placeholder="Ex: Bâtiment rouge, sonner 3 fois" value={addr.note}
        onChangeText={(v) => setAddr({ ...addr, note: v })} />
      <Text style={S.h2}>Libellé</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }}>
        {['Maison', 'Bureau', 'Autre'].map((l) => (
          <TouchableOpacity key={l} onPress={() => setAddr({ ...addr, label: l })}
            style={[S.btnGhost, { flex: 1, marginTop: 0, backgroundColor: addr.label === l ? C.primary : '#fff' }]}>
            <Text style={{ color: addr.label === l ? '#fff' : C.text, fontWeight: '700' }}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={S.btn} onPress={() => confirmAddress(true)}>
        <Text style={S.btnText}>Sauvegarder et continuer</Text>
      </TouchableOpacity>
      <TouchableOpacity style={S.btnGhost} onPress={() => confirmAddress(false)}>
        <Text style={{ fontWeight: '700' }}>Continuer sans sauvegarder</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

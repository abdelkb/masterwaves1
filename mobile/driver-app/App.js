import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';

import { loadToken, getUser, logout } from './src/api';
import { C } from './src/theme';
import AuthScreen from './src/screens/AuthScreen';
import DeliveriesScreen from './src/screens/DeliveriesScreen';
import DispatchScreen from './src/screens/DispatchScreen';
import DriversMapScreen from './src/screens/DriversMapScreen';
import NewPhoneOrderScreen from './src/screens/NewPhoneOrderScreen';
import DriversManageScreen from './src/screens/DriversManageScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function LogoutBtn({ onLogout }) {
  return (
    <TouchableOpacity onPress={onLogout} style={{ marginRight: 14 }}>
      <Text style={{ color: C.accent }}>Quitter</Text>
    </TouchableOpacity>
  );
}

// Espace livreur : une seule vue (ses livraisons multiples).
function DriverTabs({ onLogout }) {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: C.accent, headerRight: () => <LogoutBtn onLogout={onLogout} /> }}>
      <Tab.Screen name="Deliveries" component={DeliveriesScreen}
        options={{ title: 'Livraisons', tabBarLabel: 'Livraisons', tabBarIcon: () => <Text>🛵</Text> }} />
    </Tab.Navigator>
  );
}

// Espace gérant : dispatch, carte, commande téléphonique, gestion livreurs.
function ManagerTabs({ onLogout }) {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: C.accent, headerRight: () => <LogoutBtn onLogout={onLogout} /> }}>
      <Tab.Screen name="Dispatch" component={DispatchScreen}
        options={{ title: 'Commandes', tabBarIcon: () => <Text>📋</Text> }} />
      <Tab.Screen name="Map" component={DriversMapScreen}
        options={{ title: 'Carte livreurs', tabBarLabel: 'Carte', tabBarIcon: () => <Text>🗺️</Text> }} />
      <Tab.Screen name="NewOrder" component={NewPhoneOrderScreen}
        options={{ title: 'Commande tél.', tabBarLabel: 'Nouvelle', tabBarIcon: () => <Text>☎️</Text> }} />
      <Tab.Screen name="Drivers" component={DriversManageScreen}
        options={{ title: 'Livreurs', tabBarIcon: () => <Text>👤</Text> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => { await loadToken(); setUser(await getUser()); setReady(true); })();
  }, []);

  async function handleLogout() { await logout(); setUser(null); }

  if (!ready) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;

  const isManager = user && ['manager', 'admin'].includes(user.role);

  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="Auth">{() => <AuthScreen onAuth={setUser} />}</Stack.Screen>
          ) : isManager ? (
            <Stack.Screen name="Manager">{() => <ManagerTabs onLogout={handleLogout} />}</Stack.Screen>
          ) : (
            <Stack.Screen name="Driver">{() => <DriverTabs onLogout={handleLogout} />}</Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

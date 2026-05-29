import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';

import { loadToken, getUser, logout } from './src/api';
import { CartProvider } from './src/cart';
import { C } from './src/theme';
import AuthScreen from './src/screens/AuthScreen';
import RestaurantsScreen from './src/screens/RestaurantsScreen';
import MenuScreen from './src/screens/MenuScreen';
import AddressScreen from './src/screens/AddressScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import OrdersScreen from './src/screens/OrdersScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs({ onLogout }) {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: C.accent }}>
      <Tab.Screen name="Restaurants" component={RestaurantsScreen}
        options={{ tabBarLabel: 'Accueil', tabBarIcon: () => <Text>🍽️</Text> }} />
      <Tab.Screen name="Orders" component={OrdersScreen}
        options={{ tabBarLabel: 'Commandes', tabBarIcon: () => <Text>📦</Text>,
          headerRight: () => (
            <TouchableOpacity onPress={onLogout} style={{ marginRight: 14 }}>
              <Text style={{ color: C.accent }}>Déconnexion</Text>
            </TouchableOpacity>
          ) }} />
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

  return (
    <CartProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        {!user ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Auth">{() => <AuthScreen onAuth={setUser} />}</Stack.Screen>
          </Stack.Navigator>
        ) : (
          <Stack.Navigator>
            <Stack.Screen name="Tabs" options={{ headerShown: false }}>
              {() => <Tabs onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="Menu" component={MenuScreen} />
            <Stack.Screen name="Address" component={AddressScreen} options={{ title: 'Livraison' }} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Paiement' }} />
            <Stack.Screen name="Tracking" component={TrackingScreen} options={{ title: 'Suivi' }} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </CartProvider>
  );
}

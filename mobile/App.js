import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import ReportAccidentScreen from './src/screens/ReportAccidentScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or splash screen
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      {!user ? (
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'DNVT' }}
          />
          <Stack.Screen 
            name="Map" 
            component={MapScreen} 
            options={{ title: 'Mapa de Acidentes' }}
          />
          <Stack.Screen 
            name="ReportAccident" 
            component={ReportAccidentScreen} 
            options={{ title: 'Reportar Acidente' }}
          />
          <Stack.Screen 
            name="Alerts" 
            component={AlertsScreen} 
            options={{ title: 'Alertas' }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen} 
            options={{ title: 'Perfil' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

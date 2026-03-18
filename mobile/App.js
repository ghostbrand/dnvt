import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import ConnectivityGuard from './src/components/ConnectivityGuard';
import { ToastProvider } from './src/components/Toast';
import { registerForPushNotifications, addNotificationListeners } from './src/services/pushNotifications';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ReportAccidentScreen from './src/screens/ReportAccidentScreen';
import MyReportsScreen from './src/screens/MyReportsScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SidebarScreen from './src/screens/SidebarScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import MapScreen from './src/screens/MapScreen';
import AccidentDetailScreen from './src/screens/AccidentDetailScreen';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator 
      initialRouteName="Map"
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen 
        name="ReportAccident" 
        component={ReportAccidentScreen}
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: 'transparent' }
        }}
      />
      <Stack.Screen name="MyReports" component={MyReportsScreen} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="AccidentDetail" component={AccidentDetailScreen} />
      <Stack.Screen name="Sidebar" component={SidebarScreen} options={{ animation: 'slide_from_left' }} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading, token } = useAuth();
  const navigationRef = useRef(null);

  useEffect(() => {
    if (user && token) {
      registerForPushNotifications(token);

      const cleanup = addNotificationListeners(
        // On notification received while app is open
        (notification) => {
          // Notification arrived in foreground — badge will update on next HomeScreen load
        },
        // On notification tapped
        (response) => {
          const data = response?.notification?.request?.content?.data;
          if (navigationRef.current) {
            // Navigate to AccidentDetail for delegation-related notifications
            if (data?.acidente_id && ['DELEGACAO', 'DELEGACAO_APROVADA', 'DELEGACAO_REJEITADA'].includes(data?.type)) {
              navigationRef.current.navigate('AccidentDetail', { accidentId: data.acidente_id });
            } else {
              navigationRef.current.navigate('Notifications');
            }
          }
        }
      );
      return cleanup;
    }
  }, [user, token]);

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? (
        <ConnectivityGuard>
          <AppStack />
        </ConnectivityGuard>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </ToastProvider>
    </AuthProvider>
  );
}

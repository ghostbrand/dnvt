import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

// Detect if running inside Expo Go (push not supported on Android since SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';
const pushUnsupported = isExpoGo && Platform.OS === 'android';

// Configure how notifications appear when app is in foreground
// Skip on Android Expo Go to avoid the ERROR
if (!pushUnsupported) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.log('Notification handler setup skipped:', e.message);
  }
}

export async function registerForPushNotifications(token) {
  if (pushUnsupported) {
    console.log('Push notifications not supported in Expo Go on Android. Use a development build.');
    return null;
  }

  try {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Android notification channel (set up early)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notificações',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: 'default',
      });
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Get Expo push token with timeout
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenPromise = Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Push token timeout')), 8000)
    );
    const pushTokenResult = await Promise.race([tokenPromise, timeoutPromise]);
    const pushToken = pushTokenResult.data;

    // Register token on backend
    if (token && pushToken) {
      try {
        await api.registrarPushToken(pushToken, token);
      } catch (e) {
        console.log('Failed to register push token on server:', e.message);
      }
    }

    return pushToken;
  } catch (e) {
    console.log('Push notification setup error (non-fatal):', e.message);
    return null;
  }
}

export function addNotificationListeners(onReceived, onTapped) {
  if (pushUnsupported) {
    // Return no-op cleanup on Android Expo Go
    return () => {};
  }

  const receivedSub = Notifications.addNotificationReceivedListener(onReceived);
  const tappedSub = Notifications.addNotificationResponseReceivedListener(onTapped);

  return () => {
    receivedSub.remove();
    tappedSub.remove();
  };
}

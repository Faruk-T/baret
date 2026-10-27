import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsType from 'expo-notifications';

const CHANNEL_ID = 'baret_alerts';

const isExpoGo =
  isRunningInExpoGo() ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as { appOwnership?: string }).appOwnership === 'expo';

export const isUnsupportedExpoGoAndroid = Platform.OS === 'android' && isExpoGo;

let cachedNotifications: typeof NotificationsType | null = null;

function getNotificationsModule(): typeof NotificationsType | null {
  if (isUnsupportedExpoGoAndroid) {
    return null;
  }
  if (cachedNotifications) {
    return cachedNotifications;
  }
  try {
    // Dynamic require prevents expo-notifications from evaluating auto-registration
    // and throwing fatal crash on Android inside Expo Go
    cachedNotifications = require('expo-notifications') as typeof NotificationsType;
    return cachedNotifications;
  } catch (err) {
    if (__DEV__) {
      console.warn('[deviceNotifications] Failed to load expo-notifications:', err);
    }
    return null;
  }
}

// Register handler only when native notifications module is supported
const Notifications = getNotificationsModule();
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (err) {
    if (__DEV__) {
      console.warn('[deviceNotifications] Failed to set notification handler:', err);
    }
  }
} else if (isUnsupportedExpoGoAndroid && __DEV__) {
  console.info(
    '[deviceNotifications] Expo Go (Android) detected: native push/tray notifications are disabled by Expo SDK 53+. Use a development build (EAS) for system-level notifications.'
  );
}

let channelReady = false;

export async function ensureNotificationChannel(): Promise<void> {
  if (channelReady || isUnsupportedExpoGoAndroid || Platform.OS !== 'android') {
    channelReady = true;
    return;
  }
  const notif = getNotificationsModule();
  if (!notif) return;

  try {
    await notif.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Baret bildirimleri',
      description: 'Sipariş, onay ve sistem uyarıları',
      importance: notif.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: '#FF6B00',
      sound: 'default',
      enableVibrate: true,
    });
    channelReady = true;
  } catch (err) {
    if (__DEV__) {
      console.warn('[deviceNotifications] setNotificationChannelAsync failed:', err);
    }
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isUnsupportedExpoGoAndroid) return false;
  const notif = getNotificationsModule();
  if (!notif) return false;

  try {
    await ensureNotificationChannel();
    const current = await notif.getPermissionsAsync();
    if (current.granted) return true;
    if (current.status === 'denied' && !current.canAskAgain) return false;
    const next = await notif.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return next.granted;
  } catch {
    return false;
  }
}

/** Local tray notification with default system sound (works when app can schedule). */
export async function presentLocalAlert(input: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  if (isUnsupportedExpoGoAndroid) return;
  const notif = getNotificationsModule();
  if (!notif) return;

  try {
    const ok = await requestNotificationPermission();
    if (!ok) return;
    await ensureNotificationChannel();
    await notif.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        data: input.data ?? {},
        sound: true,
      },
      trigger:
        Platform.OS === 'android'
          ? {
              type: notif.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 1,
              channelId: CHANNEL_ID,
            }
          : null,
    });
  } catch (err) {
    if (__DEV__) {
      console.warn('[deviceNotifications] presentLocalAlert failed:', err);
    }
  }
}

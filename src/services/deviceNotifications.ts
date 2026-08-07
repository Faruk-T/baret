import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'baret_alerts';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let channelReady = false;

export async function ensureNotificationChannel(): Promise<void> {
  if (channelReady || Platform.OS !== 'android') {
    channelReady = true;
    return;
  }
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Baret bildirimleri',
    description: 'Sipariş, onay ve sistem uyarıları',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 200, 250],
    lightColor: '#FF6B00',
    sound: 'default',
    enableVibrate: true,
  });
  channelReady = true;
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureNotificationChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (current.status === 'denied' && !current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return next.granted;
}

/** Local tray notification with default system sound (works when app can schedule). */
export async function presentLocalAlert(input: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const ok = await requestNotificationPermission();
  if (!ok) return;
  await ensureNotificationChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      sound: true,
    },
    trigger:
      Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1,
            channelId: CHANNEL_ID,
          }
        : null,
  });
}

import { Platform } from 'react-native';
import { setStyle as setNavigationBarStyle } from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';

import { ui } from '../theme/ui';

/**
 * Android 15+ draws edge-to-edge by default (RN 0.86 / Expo 57).
 * Configure system chrome without deprecated bar-color / fitsSystemWindows APIs.
 */
export async function configureEdgeToEdge(): Promise<void> {
  try {
    await SystemUI.setBackgroundColorAsync(ui.bg);
  } catch {
    // Expo Go / web may no-op
  }

  if (Platform.OS !== 'android') return;

  try {
    // "light" = light bar chrome with dark buttons (matches Baret light UI).
    // Do not call setBackgroundColorAsync — deprecated under edge-to-edge.
    setNavigationBarStyle('light');
  } catch {
    // ignore
  }
}

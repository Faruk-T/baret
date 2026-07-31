import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

/**
 * Android 3-button nav often reports insets.bottom = 0 even when the
 * system bar sits flush under the tab bar. Force a comfortable clearance.
 */
function tabBarBottomInset(insets: EdgeInsets): number {
  if (Platform.OS === 'android') {
    // Prefer real inset when gesture/nav bar reports it; otherwise ~system bar height.
    return Math.max(insets.bottom, 48);
  }
  return Math.max(insets.bottom, 8);
}

/** Shared buyer/seller tab bar — clears Android system navigation. */
export function getTabBarScreenOptions(
  insets: EdgeInsets
): BottomTabNavigationOptions {
  const bottomInset = tabBarBottomInset(insets);
  const contentHeight = 56;

  return {
    headerShown: true,
    tabBarActiveTintColor: '#FF6B00',
    tabBarInactiveTintColor: '#78716c',
    tabBarHideOnKeyboard: true,
    tabBarStyle: {
      backgroundColor: '#fffaf7',
      borderTopColor: '#fed7aa',
      borderTopWidth: 1,
      paddingTop: 8,
      paddingBottom: bottomInset,
      height: contentHeight + bottomInset,
      elevation: 12,
    },
    tabBarItemStyle: {
      paddingVertical: 2,
    },
    headerStyle: { backgroundColor: '#FFF8F3' },
    headerShadowVisible: false,
    headerTitleStyle: { fontWeight: '700', color: '#1C1917' },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
      marginBottom: 0,
    },
  };
}

import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { EdgeInsets } from 'react-native-safe-area-context';

/** Shared buyer/seller tab bar — includes Android gesture / nav bar inset. */
export function getTabBarScreenOptions(
  insets: EdgeInsets
): BottomTabNavigationOptions {
  const bottomInset = Math.max(insets.bottom, 10);

  return {
    headerShown: true,
    tabBarActiveTintColor: '#FF6B00',
    tabBarInactiveTintColor: '#78716c',
    tabBarStyle: {
      backgroundColor: '#fffaf7',
      borderTopColor: '#fed7aa',
      borderTopWidth: 1,
      paddingTop: 6,
      paddingBottom: bottomInset,
      height: 52 + bottomInset,
      elevation: 8,
    },
    headerStyle: { backgroundColor: '#FFF8F3' },
    headerShadowVisible: false,
    headerTitleStyle: { fontWeight: '700', color: '#1C1917' },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  };
}

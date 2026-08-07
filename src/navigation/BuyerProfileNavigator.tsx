import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AboutScreen } from '../screens/about/AboutScreen';
import { ContactScreen } from '../screens/about/ContactScreen';
import { LicensesScreen } from '../screens/about/LicensesScreen';
import { ProfileScreen } from '../screens/buyer/ProfileScreen';
import type { BuyerProfileStackParamList } from '../types/navigation.types';

const Stack = createNativeStackNavigator<BuyerProfileStackParamList>();

export function BuyerProfileNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: '#FF6B00',
        headerStyle: { backgroundColor: '#FFF8F3' },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', color: '#1C1917' },
        contentStyle: { backgroundColor: '#FFF8F3' },
      }}
    >
      <Stack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: 'Hakkında' }} />
      <Stack.Screen
        name="Licenses"
        component={LicensesScreen}
        options={{ title: 'Lisanslar' }}
      />
      <Stack.Screen
        name="Contact"
        component={ContactScreen}
        options={{ title: 'Bize ulaşın' }}
      />
    </Stack.Navigator>
  );
}

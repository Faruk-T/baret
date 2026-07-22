import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { CartScreen } from '../screens/buyer/CartScreen';
import { HomeScreen } from '../screens/buyer/HomeScreen';
import { OrdersScreen } from '../screens/buyer/OrdersScreen';
import { ProfileScreen } from '../screens/buyer/ProfileScreen';
import type { BuyerTabParamList } from '../types/navigation.types';

const Tab = createBottomTabNavigator<BuyerTabParamList>();

export function BuyerNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Ana Sayfa' }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ title: 'Sepet' }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: 'Siparişlerim' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

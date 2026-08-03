import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BuyerCartNavigator } from './BuyerCartNavigator';
import { BuyerHomeNavigator } from './BuyerHomeNavigator';
import { tabIcon } from './tabIcons';
import { getTabBarScreenOptions } from './tabBarOptions';
import { OrdersScreen } from '../screens/buyer/OrdersScreen';
import { ProfileScreen } from '../screens/buyer/ProfileScreen';
import { useCart } from '../context/CartContext';
import type { BuyerTabParamList } from '../types/navigation.types';

const Tab = createBottomTabNavigator<BuyerTabParamList>();

export function BuyerNavigator() {
  const { itemCount } = useCart();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator screenOptions={getTabBarScreenOptions(insets)}>
      <Tab.Screen
        name="Home"
        component={BuyerHomeNavigator}
        options={{
          title: 'Ana Sayfa',
          headerShown: false,
          tabBarIcon: tabIcon('home-outline', 'home'),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={BuyerCartNavigator}
        options={{
          title: 'Sepet',
          headerShown: false,
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarIcon: tabIcon('cart-outline', 'cart'),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: 'Siparişlerim',
          tabBarIcon: tabIcon('receipt-outline', 'receipt'),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          headerShown: false,
          tabBarIcon: tabIcon('person-outline', 'person'),
        }}
      />
    </Tab.Navigator>
  );
}

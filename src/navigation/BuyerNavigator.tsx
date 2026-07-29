import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { BuyerCartNavigator } from './BuyerCartNavigator';
import { BuyerHomeNavigator } from './BuyerHomeNavigator';
import { tabIcon } from './tabIcons';
import { OrdersScreen } from '../screens/buyer/OrdersScreen';
import { ProfileScreen } from '../screens/buyer/ProfileScreen';
import { useCart } from '../context/CartContext';
import type { BuyerTabParamList } from '../types/navigation.types';

const Tab = createBottomTabNavigator<BuyerTabParamList>();

export function BuyerNavigator() {
  const { itemCount } = useCart();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#FF6B00',
        tabBarInactiveTintColor: '#78716c',
        tabBarStyle: { backgroundColor: '#fffaf7', borderTopColor: '#e7e5e4' },
      }}
    >
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
          tabBarIcon: tabIcon('person-outline', 'person'),
        }}
      />
    </Tab.Navigator>
  );
}

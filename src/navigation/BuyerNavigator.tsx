import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BuyerCartNavigator } from './BuyerCartNavigator';
import { BuyerHomeNavigator } from './BuyerHomeNavigator';
import { BuyerProfileNavigator } from './BuyerProfileNavigator';
import { tabIcon } from './tabIcons';
import { getTabBarScreenOptions } from './tabBarOptions';
import { OrdersScreen } from '../screens/buyer/OrdersScreen';
import { RfqScreen } from '../screens/buyer/RfqScreen';
import { useCart } from '../context/CartContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import type { BuyerTabParamList } from '../types/navigation.types';

const Tab = createBottomTabNavigator<BuyerTabParamList>();

export function BuyerNavigator() {
  const { itemCount } = useCart();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsiveLayout();
  const baseOptions = getTabBarScreenOptions(insets);

  return (
    <Tab.Navigator
      tabBar={isDesktop ? () => null : undefined}
      screenOptions={{
        ...baseOptions,
        headerShown: isDesktop ? false : baseOptions.headerShown,
      }}
    >
      <Tab.Screen
        name="Home"
        component={BuyerHomeNavigator}
        options={{
          title: 'Katalog',
          headerShown: false,
          tabBarIcon: tabIcon('home-outline', 'home'),
        }}
      />
      <Tab.Screen
        name="Rfq"
        component={RfqScreen}
        options={{
          title: 'İhale / Teklif',
          headerTitle: 'Şantiye İhalesi (Teklif İste)',
          headerShown: !isDesktop,
          tabBarIcon: tabIcon('document-text-outline', 'document-text'),
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
          headerShown: !isDesktop,
          tabBarIcon: tabIcon('receipt-outline', 'receipt'),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={BuyerProfileNavigator}
        options={{
          title: 'Profil',
          headerShown: false,
          tabBarIcon: tabIcon('person-outline', 'person'),
        }}
      />
    </Tab.Navigator>
  );
}

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { SellerDashboardScreen } from '../screens/seller/SellerDashboardScreen';
import { SellerOrdersScreen } from '../screens/seller/SellerOrdersScreen';
import { StoreSettingsScreen } from '../screens/seller/StoreSettingsScreen';
import type { SellerTabParamList } from '../types/navigation.types';
import { SellerProductsNavigator } from './SellerProductsNavigator';
import { tabIcon } from './tabIcons';

const Tab = createBottomTabNavigator<SellerTabParamList>();

export function SellerNavigator() {
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
        name="Dashboard"
        component={SellerDashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: tabIcon('grid-outline', 'grid'),
        }}
      />
      <Tab.Screen
        name="Products"
        component={SellerProductsNavigator}
        options={{
          title: 'Ürünlerim',
          headerShown: false,
          tabBarIcon: tabIcon('cube-outline', 'cube'),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={SellerOrdersScreen}
        options={{
          title: 'Siparişler',
          tabBarIcon: tabIcon('receipt-outline', 'receipt'),
        }}
      />
      <Tab.Screen
        name="StoreSettings"
        component={StoreSettingsScreen}
        options={{
          title: 'Mağaza',
          tabBarIcon: tabIcon('storefront-outline', 'storefront'),
        }}
      />
    </Tab.Navigator>
  );
}

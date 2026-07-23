import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { SellerDashboardScreen } from '../screens/seller/SellerDashboardScreen';
import { SellerOrdersScreen } from '../screens/seller/SellerOrdersScreen';
import { StoreSettingsScreen } from '../screens/seller/StoreSettingsScreen';
import type { SellerTabParamList } from '../types/navigation.types';
import { SellerProductsNavigator } from './SellerProductsNavigator';

const Tab = createBottomTabNavigator<SellerTabParamList>();

export function SellerNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen
        name="Dashboard"
        component={SellerDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="Products"
        component={SellerProductsNavigator}
        options={{ title: 'Ürünlerim', headerShown: false }}
      />
      <Tab.Screen name="Orders" component={SellerOrdersScreen} options={{ title: 'Siparişler' }} />
      <Tab.Screen
        name="StoreSettings"
        component={StoreSettingsScreen}
        options={{ title: 'Mağaza' }}
      />
    </Tab.Navigator>
  );
}

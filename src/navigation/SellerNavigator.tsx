import { useCallback, useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { SellerDashboardScreen } from '../screens/seller/SellerDashboardScreen';
import { SellerOrdersScreen } from '../screens/seller/SellerOrdersScreen';
import { StoreSettingsScreen } from '../screens/seller/StoreSettingsScreen';
import { countPendingStoreOrders } from '../services/orders';
import { getMyStore } from '../services/stores';
import type { SellerTabParamList } from '../types/navigation.types';
import { SellerProductsNavigator } from './SellerProductsNavigator';
import { tabIcon } from './tabIcons';

const Tab = createBottomTabNavigator<SellerTabParamList>();

export function SellerNavigator() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingBadge = useCallback(async () => {
    if (!user?.id) {
      setPendingCount(0);
      return;
    }
    try {
      const store = await getMyStore(user.id);
      if (!store) {
        setPendingCount(0);
        return;
      }
      const count = await countPendingStoreOrders(store.id);
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  }, [user?.id]);

  useEffect(() => {
    void refreshPendingBadge();
    const timer = setInterval(() => {
      void refreshPendingBadge();
    }, 20000);
    return () => clearInterval(timer);
  }, [refreshPendingBadge]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#FF6B00',
        tabBarInactiveTintColor: '#78716c',
        tabBarStyle: {
          backgroundColor: '#fffaf7',
          borderTopColor: '#fed7aa',
          height: 60,
          paddingBottom: 6,
          paddingTop: 4,
        },
        headerStyle: { backgroundColor: '#FFF8F3' },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', color: '#1C1917' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
      screenListeners={{
        focus: () => {
          void refreshPendingBadge();
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={SellerDashboardScreen}
        options={{
          title: 'Özet',
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
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#FF6B00',
            color: '#fff',
            fontSize: 11,
            fontWeight: '700',
          },
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

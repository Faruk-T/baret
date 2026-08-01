import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { SellerDashboardScreen } from '../screens/seller/SellerDashboardScreen';
import { SellerOrdersScreen } from '../screens/seller/SellerOrdersScreen';
import { StoreSettingsScreen } from '../screens/seller/StoreSettingsScreen';
import { countPendingStoreOrders } from '../services/orders';
import { getMyStore } from '../services/stores';
import type { SellerTabParamList } from '../types/navigation.types';
import { isLicenseValid } from '../utils/license';
import { SellerProductsNavigator } from './SellerProductsNavigator';
import { getTabBarScreenOptions } from './tabBarOptions';
import { tabIcon } from './tabIcons';
import { ui } from '../theme/ui';

const Tab = createBottomTabNavigator<SellerTabParamList>();
const LockedTab = createBottomTabNavigator();

export function SellerNavigator() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [pendingCount, setPendingCount] = useState(0);
  const [licenseOk, setLicenseOk] = useState<boolean | null>(null);
  const [hasStore, setHasStore] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setPendingCount(0);
      setLicenseOk(true);
      setHasStore(false);
      return;
    }
    try {
      const store = await getMyStore(user.id);
      if (!store) {
        setHasStore(false);
        setLicenseOk(true); // allow creating store first
        setPendingCount(0);
        return;
      }
      setHasStore(true);
      setLicenseOk(isLicenseValid(store.license_expires_at));
      const count = await countPendingStoreOrders(store.id);
      setPendingCount(count);
    } catch {
      setPendingCount(0);
      setLicenseOk(true);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [refresh]);

  if (licenseOk === null) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator color={ui.brand} />
      </View>
    );
  }

  // No valid license → only Mağaza tab (redeem)
  if (hasStore && !licenseOk) {
    return (
      <LockedTab.Navigator screenOptions={getTabBarScreenOptions(insets)}>
        <LockedTab.Screen
          name="StoreSettings"
          component={StoreSettingsScreen}
          options={{
            title: 'Lisans gerekli',
            tabBarIcon: tabIcon('key-outline', 'key'),
          }}
          listeners={{ focus: () => void refresh() }}
        />
      </LockedTab.Navigator>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={getTabBarScreenOptions(insets)}
      screenListeners={{
        focus: () => {
          void refresh();
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

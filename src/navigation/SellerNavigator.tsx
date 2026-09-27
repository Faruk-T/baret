import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AboutScreen } from '../screens/about/AboutScreen';
import { ContactScreen } from '../screens/about/ContactScreen';
import { LicensesScreen } from '../screens/about/LicensesScreen';
import { NotificationBellButton } from '../components/notifications/NotificationBellButton';
import { useAuth } from '../context/AuthContext';
import { SellerDashboardScreen } from '../screens/seller/SellerDashboardScreen';
import { SellerNotificationsScreen } from '../screens/seller/SellerNotificationsScreen';
import { SellerOrdersScreen } from '../screens/seller/SellerOrdersScreen';
import { StoreSettingsScreen } from '../screens/seller/StoreSettingsScreen';
import { countUnreadNotifications } from '../services/adminOps';
import {
  countOpenStoreOrders,
  countPendingStoreOrders,
} from '../services/orders';
import { getMyStore } from '../services/stores';
import type {
  SellerStackParamList,
  SellerTabParamList,
} from '../types/navigation.types';
import { isLicenseValid } from '../utils/license';
import { SellerProductsNavigator } from './SellerProductsNavigator';
import { getTabBarScreenOptions } from './tabBarOptions';
import { tabIcon } from './tabIcons';
import { ui } from '../theme/ui';

const Tab = createBottomTabNavigator<SellerTabParamList>();
const Stack = createNativeStackNavigator<SellerStackParamList>();
const LockedTab = createBottomTabNavigator();

function SellerTabs() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [pendingCount, setPendingCount] = useState(0);
  const [unread, setUnread] = useState(0);
  const [licenseOk, setLicenseOk] = useState<boolean | null>(null);
  const [hasStore, setHasStore] = useState(false);
  const [openFulfillment, setOpenFulfillment] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setPendingCount(0);
      setUnread(0);
      setLicenseOk(true);
      setHasStore(false);
      setOpenFulfillment(false);
      return;
    }
    try {
      const store = await getMyStore(user.id);
      const notes = await countUnreadNotifications(user.id).catch(() => 0);
      setUnread(notes);
      if (!store) {
        setHasStore(false);
        setLicenseOk(true);
        setPendingCount(0);
        setOpenFulfillment(false);
        return;
      }
      setHasStore(true);
      const valid = isLicenseValid(store.license_expires_at);
      setLicenseOk(valid);
      const [pending, open] = await Promise.all([
        countPendingStoreOrders(store.id),
        countOpenStoreOrders(store.id),
      ]);
      setPendingCount(pending);
      setOpenFulfillment(open > 0);
    } catch {
      setPendingCount(0);
      setLicenseOk(true);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 12000);
    return () => clearInterval(timer);
  }, [refresh]);

  if (licenseOk === null) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator color={ui.brand} />
      </View>
    );
  }

  // License expired: Mağaza + (açık sipariş varsa) Siparişler — fulfillment kilitlenmesin
  if (hasStore && !licenseOk) {
    return (
      <LockedTab.Navigator screenOptions={getTabBarScreenOptions(insets)}>
        {openFulfillment ? (
          <LockedTab.Screen
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
            listeners={{ focus: () => void refresh() }}
          />
        ) : null}
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
        options={({ navigation }) => ({
          title: 'Özet',
          tabBarIcon: tabIcon('grid-outline', 'grid'),
          headerRight: () => (
            <NotificationBellButton
              unread={unread}
              onPress={() =>
                navigation.getParent()?.navigate('Notifications' as never)
              }
            />
          ),
        })}
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
        options={({ navigation }) => ({
          title: 'Siparişler',
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#FF6B00',
            color: '#fff',
            fontSize: 11,
            fontWeight: '700',
          },
          tabBarIcon: tabIcon('receipt-outline', 'receipt'),
          headerRight: () => (
            <NotificationBellButton
              unread={unread}
              onPress={() =>
                navigation.getParent()?.navigate('Notifications' as never)
              }
            />
          ),
        })}
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

export function SellerNavigator() {
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
        name="SellerTabs"
        component={SellerTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={SellerNotificationsScreen}
        options={{ title: 'Bildirimler' }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{
          title: 'Credits',
          headerStyle: { backgroundColor: '#0B1220' },
          headerTintColor: '#FF6B00',
          headerTitleStyle: { fontWeight: '700', color: '#fff' },
          contentStyle: { backgroundColor: '#0B1220' },
        }}
      />
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

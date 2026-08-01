import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminHomeScreen } from '../screens/admin/AdminHomeScreen';
import { AdminOrdersScreen } from '../screens/admin/AdminOrdersScreen';
import { BuyerAdminDetailScreen } from '../screens/admin/BuyerAdminDetailScreen';
import { CommissionScreen } from '../screens/admin/CommissionScreen';
import { LicenseKeysScreen } from '../screens/admin/LicenseKeysScreen';
import { PeopleHubScreen } from '../screens/admin/PeopleHubScreen';
import { ReportsScreen } from '../screens/admin/ReportsScreen';
import { SellerAdminDetailScreen } from '../screens/admin/SellerAdminDetailScreen';
import { SellerApprovalScreen } from '../screens/admin/SellerApprovalScreen';
import { StoreCommissionDetailScreen } from '../screens/admin/StoreCommissionDetailScreen';
import { UserManagementScreen } from '../screens/admin/UserManagementScreen';
import type { AdminStackParamList } from '../types/navigation.types';

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="AdminHome"
      screenOptions={{
        headerShown: true,
        headerTintColor: '#FF6B00',
        headerStyle: { backgroundColor: '#FFF8F3' },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', color: '#1C1917' },
        contentStyle: { backgroundColor: '#FFF8F3' },
      }}
    >
      <Stack.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{ title: 'Admin', headerShown: false }}
      />
      <Stack.Screen
        name="PeopleHub"
        component={PeopleHubScreen}
        options={{ title: 'Alıcılar & Satıcılar' }}
      />
      <Stack.Screen
        name="SellerAdminDetail"
        component={SellerAdminDetailScreen}
        options={{ title: 'Satıcı detay' }}
      />
      <Stack.Screen
        name="BuyerAdminDetail"
        component={BuyerAdminDetailScreen}
        options={{ title: 'Alıcı detay' }}
      />
      <Stack.Screen
        name="StoreCommissionDetail"
        component={StoreCommissionDetailScreen}
        options={{
          title: 'Tahsilat',
          headerStyle: { backgroundColor: '#0B1220' },
          headerTintColor: '#FF6B00',
          headerTitleStyle: { fontWeight: '700', color: '#fff' },
          contentStyle: { backgroundColor: '#0B1220' },
        }}
      />
      <Stack.Screen
        name="AdminOrders"
        component={AdminOrdersScreen}
        options={{ title: 'Sipariş merkezi' }}
      />
      <Stack.Screen
        name="SellerApprovals"
        component={SellerApprovalScreen}
        options={{ title: 'Satıcı Onayları' }}
      />
      <Stack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{ title: 'Kullanıcılar' }}
      />
      <Stack.Screen
        name="PlatformStats"
        component={AdminDashboardScreen}
        options={{ title: 'İstatistikler' }}
      />
      <Stack.Screen
        name="LicenseKeys"
        component={LicenseKeysScreen}
        options={{ title: 'Lisans Anahtarları' }}
      />
      <Stack.Screen
        name="Commission"
        component={CommissionScreen}
        options={{ title: 'Komisyon' }}
      />
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Şikayetler' }}
      />
    </Stack.Navigator>
  );
}

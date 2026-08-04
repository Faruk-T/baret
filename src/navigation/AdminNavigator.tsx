import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminHomeScreen } from '../screens/admin/AdminHomeScreen';
import { AdminOrdersScreen } from '../screens/admin/AdminOrdersScreen';
import { AdminRolesScreen } from '../screens/admin/AdminRolesScreen';
import { AuditLogScreen } from '../screens/admin/AuditLogScreen';
import { BuyerAdminDetailScreen } from '../screens/admin/BuyerAdminDetailScreen';
import { CommissionScreen } from '../screens/admin/CommissionScreen';
import { FinanceSummaryScreen } from '../screens/admin/FinanceSummaryScreen';
import { LicenseKeysScreen } from '../screens/admin/LicenseKeysScreen';
import { NotificationsCenterScreen } from '../screens/admin/NotificationsCenterScreen';
import { PeopleHubScreen } from '../screens/admin/PeopleHubScreen';
import { ProductModerationScreen } from '../screens/admin/ProductModerationScreen';
import { ReportsScreen } from '../screens/admin/ReportsScreen';
import { SellerAdminDetailScreen } from '../screens/admin/SellerAdminDetailScreen';
import { SellerApprovalScreen } from '../screens/admin/SellerApprovalScreen';
import { SellerPlansScreen } from '../screens/admin/SellerPlansScreen';
import { StoreCommissionDetailScreen } from '../screens/admin/StoreCommissionDetailScreen';
import { StoreHealthScreen } from '../screens/admin/StoreHealthScreen';
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
        name="FinanceSummary"
        component={FinanceSummaryScreen}
        options={{ title: 'Finans özeti' }}
      />
      <Stack.Screen
        name="StoreHealth"
        component={StoreHealthScreen}
        options={{ title: 'Mağaza sağlığı' }}
      />
      <Stack.Screen
        name="AuditLog"
        component={AuditLogScreen}
        options={{ title: 'Audit log' }}
      />
      <Stack.Screen
        name="ProductModeration"
        component={ProductModerationScreen}
        options={{ title: 'İçerik denetimi' }}
      />
      <Stack.Screen
        name="NotificationsCenter"
        component={NotificationsCenterScreen}
        options={{ title: 'Bildirim merkezi' }}
      />
      <Stack.Screen
        name="AdminRoles"
        component={AdminRolesScreen}
        options={{ title: 'Rol yetkileri' }}
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
        name="SellerPlans"
        component={SellerPlansScreen}
        options={{ title: 'Satıcı planları' }}
      />
      <Stack.Screen
        name="LicenseKeys"
        component={LicenseKeysScreen}
        options={{ title: 'Lisans Anahtarları' }}
      />
      <Stack.Screen
        name="Commission"
        component={CommissionScreen}
        options={{ title: 'Eski komisyon (arşiv)' }}
      />
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Şikayetler' }}
      />
    </Stack.Navigator>
  );
}

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminHomeScreen } from '../screens/admin/AdminHomeScreen';
import { SellerApprovalScreen } from '../screens/admin/SellerApprovalScreen';
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
      }}
    >
      <Stack.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{ title: 'Admin' }}
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
    </Stack.Navigator>
  );
}

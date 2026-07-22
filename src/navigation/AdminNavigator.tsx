import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { SellerApprovalScreen } from '../screens/admin/SellerApprovalScreen';
import { UserManagementScreen } from '../screens/admin/UserManagementScreen';
import type { AdminStackParamList } from '../types/navigation.types';

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
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

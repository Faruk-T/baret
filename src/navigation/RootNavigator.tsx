import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../types/navigation.types';
import { AdminNavigator } from './AdminNavigator';
import { AuthNavigator } from './AuthNavigator';
import { BuyerNavigator } from './BuyerNavigator';
import { SellerNavigator } from './SellerNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session || !user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : role === 'seller' ? (
          <Stack.Screen name="Seller" component={SellerNavigator} />
        ) : role === 'admin' ? (
          <Stack.Screen name="Admin" component={AdminNavigator} />
        ) : (
          <Stack.Screen name="Buyer" component={BuyerNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

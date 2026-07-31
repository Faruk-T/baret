import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/buyer/HomeScreen';
import { ProductDetailScreen } from '../screens/buyer/ProductDetailScreen';
import type { BuyerHomeStackParamList } from '../types/navigation.types';

const Stack = createNativeStackNavigator<BuyerHomeStackParamList>();

export function BuyerHomeNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FFF8F3' },
        headerShadowVisible: false,
        headerTintColor: '#FF6B00',
        headerTitleStyle: { fontWeight: '700', color: '#1C1917' },
        contentStyle: { backgroundColor: '#FFF8F3' },
      }}
    >
      <Stack.Screen
        name="HomeList"
        component={HomeScreen}
        options={{ title: 'Baret' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'Ürün Detay' }}
      />
    </Stack.Navigator>
  );
}

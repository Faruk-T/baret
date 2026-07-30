import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/buyer/HomeScreen';
import { ProductDetailScreen } from '../screens/buyer/ProductDetailScreen';
import type { BuyerHomeStackParamList } from '../types/navigation.types';

const Stack = createNativeStackNavigator<BuyerHomeStackParamList>();

export function BuyerHomeNavigator() {
  return (
    <Stack.Navigator>
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

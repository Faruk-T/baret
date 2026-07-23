import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ProductFormScreen } from '../screens/seller/ProductFormScreen';
import { ProductListScreen } from '../screens/seller/ProductListScreen';
import type { SellerProductsStackParamList } from '../types/navigation.types';

const Stack = createNativeStackNavigator<SellerProductsStackParamList>();

export function SellerProductsNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{ title: 'Ürünlerim' }}
      />
      <Stack.Screen
        name="ProductForm"
        component={ProductFormScreen}
        options={({ route }) => ({
          title: route.params?.productId ? 'Ürünü Düzenle' : 'Yeni Ürün',
        })}
      />
    </Stack.Navigator>
  );
}

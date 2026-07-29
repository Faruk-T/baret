import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CartScreen } from '../screens/buyer/CartScreen';
import { CheckoutScreen } from '../screens/buyer/CheckoutScreen';
import type { BuyerCartStackParamList } from '../types/navigation.types';

const Stack = createNativeStackNavigator<BuyerCartStackParamList>();

export function BuyerCartNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CartList"
        component={CartScreen}
        options={{ title: 'Sepet' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: 'Sipariş / Checkout' }}
      />
    </Stack.Navigator>
  );
}

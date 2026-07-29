import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { BuyerHomeNavigator } from './BuyerHomeNavigator';
import { CartScreen } from '../screens/buyer/CartScreen';
import { OrdersScreen } from '../screens/buyer/OrdersScreen';
import { ProfileScreen } from '../screens/buyer/ProfileScreen';
import { useCart } from '../context/CartContext';
import type { BuyerTabParamList } from '../types/navigation.types';

const Tab = createBottomTabNavigator<BuyerTabParamList>();

export function BuyerNavigator() {
  const { itemCount } = useCart();

  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen
        name="Home"
        component={BuyerHomeNavigator}
        options={{ title: 'Ana Sayfa', headerShown: false }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          title: 'Sepet',
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
        }}
      />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: 'Siparişlerim' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

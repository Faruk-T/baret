import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationRealtimeBridge } from './src/components/notifications/NotificationRealtimeBridge';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <NotificationRealtimeBridge />
          <RootNavigator />
          <StatusBar style="dark" />
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

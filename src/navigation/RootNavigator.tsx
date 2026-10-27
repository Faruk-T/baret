import { ActivityIndicator, Platform, View } from 'react-native';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import type { RootStackParamList } from '../types/navigation.types';
import { AdminNavigator } from './AdminNavigator';
import { AuthNavigator } from './AuthNavigator';
import { BuyerNavigator } from './BuyerNavigator';
import { SellerNavigator } from './SellerNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['baret://', 'https://baret.app', 'http://localhost:8081'],
  config: {
    screens: {
      Buyer: {
        screens: {
          Home: {
            screens: {
              HomeList: '',
              ProductDetail: 'urun/:productId',
            },
          },
          Cart: {
            screens: {
              CartList: 'sepet',
              Checkout: 'odeme',
            },
          },
          Rfq: 'ihale-teklif',
          Orders: 'siparislerim',
          Profile: {
            screens: {
              ProfileHome: 'profil',
              About: 'hakkinda',
              Licenses: 'lisanslar',
              Contact: 'iletisim',
            },
          },
        },
      },
      Auth: 'hesap',
      Seller: 'satici',
      Admin: 'yonetim',
    },
  },
};

export function RootNavigator() {
  const { session, user, role, isLoading, isPasswordRecovery } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  if (isPasswordRecovery) {
    return (
      <NavigationContainer>
        <ResetPasswordScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer
      linking={Platform.OS === 'web' ? linking : undefined}
      documentTitle={{
        formatter: (options) =>
          options?.title
            ? `${options.title} | Baret B2B Yapı & Nalbur Pazaryeri`
            : 'Baret | İnşaat, Şantiye & Nalbur Pazaryeri',
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session || !user ? (
          <>
            {/* Guest Mode enabled by default for Web SEO/conversion & Apple Guideline 5.1.1 */}
            <Stack.Screen name="Buyer" component={BuyerNavigator} />
            <Stack.Screen
              name="Auth"
              component={AuthNavigator}
              options={{ presentation: 'card' }}
            />
          </>
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

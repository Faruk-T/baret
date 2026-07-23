import { Pressable, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import type { AuthStackParamList } from '../../types/navigation.types';

type RoleSelectNavigation = NativeStackNavigationProp<AuthStackParamList, 'RoleSelect'>;

export function RoleSelectScreen() {
  const navigation = useNavigation<RoleSelectNavigation>();

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="mb-2 text-3xl font-bold text-gray-900">Rolünü seç</Text>
      <Text className="mb-8 text-base text-gray-500">
        Alıcı olarak malzeme ara veya satıcı olarak mağaza aç.
      </Text>

      <Pressable
        className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-5"
        onPress={() => navigation.navigate('Register', { role: 'buyer' })}
      >
        <Text className="mb-1 text-lg font-semibold text-gray-900">Alıcı</Text>
        <Text className="text-sm text-gray-500">
          İnşaat mühendisi / şantiye ekibi — ürün ara, sipariş ver
        </Text>
      </Pressable>

      <Pressable
        className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-5"
        onPress={() => navigation.navigate('Register', { role: 'seller' })}
      >
        <Text className="mb-1 text-lg font-semibold text-brand">Satıcı</Text>
        <Text className="text-sm text-gray-600">
          Nalbur / hırdavatçı — mağaza oluştur, ürün sat
        </Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Login')}>
        <Text className="text-center text-sm text-gray-600">
          Zaten hesabın var mı? <Text className="font-semibold text-brand">Giriş Yap</Text>
        </Text>
      </Pressable>
    </View>
  );
}

import { Pressable, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import type { AuthStackParamList } from '../../types/navigation.types';

type RoleSelectNavigation = NativeStackNavigationProp<AuthStackParamList, 'RoleSelect'>;

export function RoleSelectScreen() {
  const navigation = useNavigation<RoleSelectNavigation>();

  return (
    <View className="flex-1 bg-[#fffaf7]">
      <View className="bg-brand px-6 pb-10 pt-16">
        <Text className="text-4xl font-bold text-white">Baret</Text>
        <Text className="mt-2 text-base text-orange-100">
          İnşaat ve nalbur pazaryeri
        </Text>
      </View>

      <View className="-mt-5 flex-1 rounded-t-3xl bg-[#fffaf7] px-6 pt-8">
        <Text className="mb-1 text-2xl font-bold text-stone-900">Rolünü seç</Text>
        <Text className="mb-6 text-base text-stone-500">
          Alıcı olarak malzeme ara veya satıcı olarak mağaza aç.
        </Text>

        <Pressable
          className="mb-3 rounded-2xl border border-stone-200 bg-white p-5"
          style={{
            shadowColor: '#1c1917',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 1,
          }}
          onPress={() => navigation.navigate('Register', { role: 'buyer' })}
        >
          <Text className="mb-1 text-lg font-semibold text-stone-900">Alıcı</Text>
          <Text className="text-sm text-stone-500">
            İnşaat mühendisi / şantiye ekibi — ürün ara, sipariş ver
          </Text>
        </Pressable>

        <Pressable
          className="mb-8 rounded-2xl border border-brand bg-orange-50 p-5"
          onPress={() => navigation.navigate('Register', { role: 'seller' })}
        >
          <Text className="mb-1 text-lg font-semibold text-brand">Satıcı</Text>
          <Text className="text-sm text-stone-600">
            Nalbur / hırdavatçı — mağaza oluştur, ürün sat
          </Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text className="text-center text-sm text-stone-600">
            Zaten hesabın var mı?{' '}
            <Text className="font-semibold text-brand">Giriş Yap</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

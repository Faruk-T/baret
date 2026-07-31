import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { BrandHero } from '../../components/ui/BrandHero';
import { UiCard } from '../../components/ui/UiCard';
import type { AuthStackParamList } from '../../types/navigation.types';
import { ui } from '../../theme/ui';

type RoleSelectNavigation = NativeStackNavigationProp<AuthStackParamList, 'RoleSelect'>;

export function RoleSelectScreen() {
  const navigation = useNavigation<RoleSelectNavigation>();

  return (
    <View className="flex-1 bg-[#FFF8F3]">
      <BrandHero
        eyebrow="Başla"
        title="Baret"
        subtitle="Rolünü seç — her yol aynı güçlü katalog ve sipariş deneyimine açılır."
      />

      <View className="-mt-5 flex-1 rounded-t-3xl bg-[#FFF8F3] px-5 pt-7">
        <Text className="mb-1 text-xl font-bold text-stone-900">Kim olarak devam?</Text>
        <Text className="mb-5 text-sm text-stone-500">
          İstersen sonra başka hesapla da giriş yapabilirsin.
        </Text>

        <Pressable
          onPress={() => navigation.navigate('Register', { role: 'buyer' })}
          className="mb-3"
        >
          <UiCard className="flex-row items-center">
            <View
              className="mr-3 h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: ui.brandSoft }}
            >
              <Ionicons name="construct-outline" size={28} color={ui.brand} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-stone-900">Alıcı</Text>
              <Text className="mt-1 text-sm leading-5 text-stone-500">
                Mühendis / şantiye — ürün ara, mesafe gör, sipariş ver
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={ui.brand} />
          </UiCard>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Register', { role: 'seller' })}
          className="mb-8"
        >
          <UiCard
            className="flex-row items-center border-brand"
            style={{ backgroundColor: ui.brandSoft }}
          >
            <View className="mr-3 h-14 w-14 items-center justify-center rounded-2xl bg-brand">
              <Ionicons name="storefront" size={28} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-brand">Satıcı</Text>
              <Text className="mt-1 text-sm leading-5 text-stone-600">
                Nalbur / hırdavat — mağaza aç, stok yönet, sipariş al
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={ui.brand} />
          </UiCard>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text className="text-center text-sm text-stone-600">
            Zaten hesabın var mı?{' '}
            <Text className="font-bold text-brand">Giriş Yap</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

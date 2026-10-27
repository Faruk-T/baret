import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { BrandHero } from '../../components/ui/BrandHero';
import { UiCard } from '../../components/ui/UiCard';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import type { AuthStackParamList } from '../../types/navigation.types';
import { usePageSeo } from '../../utils/seo';

type RoleSelectNavigation = NativeStackNavigationProp<AuthStackParamList, 'RoleSelect'>;

export function RoleSelectScreen() {
  const navigation = useNavigation<RoleSelectNavigation>();
  const { isDesktop } = useResponsiveLayout();

  usePageSeo({
    title: 'Hesap Oluştur — Alıcı veya Tedarikçi Kaydı | Baret',
    description:
      'Baret yapı malzemeleri tedarik platformuna müteahhit/alıcı veya onaylı nalbur/yapı market satıcısı olarak ücretsiz katılın.',
    canonicalPath: '/register',
  });

  const handleBackToGuestCatalog = () => {
    const parent = navigation.getParent() as any;
    if (parent?.canGoBack()) {
      parent.goBack();
    } else {
      parent?.navigate('Buyer');
    }
  };

  return (
    <ScrollView className="flex-1 bg-zinc-50" contentContainerClassName="flex-grow">
      <BrandHero
        eyebrow="Kurumsal & Bireysel Üyelik"
        title="Baret"
        subtitle="Hesap türünüzü seçerek yapı malzemeleri tedarik ağına katılın."
      />

      <View
        className={
          isDesktop
            ? 'w-full max-w-[540px] self-center my-10 rounded-2xl bg-white p-8 border border-zinc-200'
            : '-mt-5 flex-1 rounded-t-3xl bg-zinc-50 px-5 pt-7 pb-10'
        }
      >
        <Pressable
          onPress={handleBackToGuestCatalog}
          className="mb-5 self-start bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg"
        >
          <Text className="text-xs font-semibold text-zinc-800">
            ← Kataloğa Geri Dön
          </Text>
        </Pressable>

        <Text className="mb-1 text-xl font-bold text-zinc-900">Hesap Türü Seçin</Text>
        <Text className="mb-6 text-sm text-zinc-500">
          Kullanım amacınıza uygun hesap türünü seçerek birkaç adımda kaydınızı tamamlayın.
        </Text>

        <Pressable
          onPress={() => navigation.navigate('Register', { role: 'buyer' })}
          className="mb-3"
        >
          <UiCard className="flex-row items-center">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
              <Ionicons name="construct-outline" size={24} color="#18181B" />
            </View>
            <View className="flex-1 pr-2">
              <Text className="text-base font-bold text-zinc-900">
                Alıcı Hesabı (Müteahhit / Şantiye / Bireysel)
              </Text>
              <Text className="mt-1 text-xs leading-5 text-zinc-500">
                Yapı malzemesi arayın, kademeli toptan fiyatları görün, ihale (RFQ) açın ve sipariş verin
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#18181B" />
          </UiCard>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Register', { role: 'seller' })}
          className="mb-8"
        >
          <UiCard className="flex-row items-center border-amber-300 bg-amber-50/40">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-xl bg-zinc-900">
              <Ionicons name="storefront-outline" size={22} color="#FFFFFF" />
            </View>
            <View className="flex-1 pr-2">
              <Text className="text-base font-bold text-zinc-900">
                Tedarikçi Mağaza Hesabı (Nalbur / Yapı Market)
              </Text>
              <Text className="mt-1 text-xs leading-5 text-zinc-600">
                Mağazanızı açın, ürün ve stoklarınızı yönetin, şantiye ihalelerine teklif verin
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#B45309" />
          </UiCard>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text className="text-center text-sm text-zinc-600">
            Zaten hesabınız var mı?{' '}
            <Text className="font-bold text-zinc-900 underline">Giriş Yapın</Text>
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

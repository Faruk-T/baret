import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BrandHero } from '../../components/ui/BrandHero';
import { UiCard } from '../../components/ui/UiCard';
import {
  PLAY_STORE_URL,
  TRUNCGIL_URL,
  getLandingUrl,
  landingPath,
} from '../../constants/about';
import { ui } from '../../theme/ui';

export function ContactScreen() {
  return (
    <ScrollView className="flex-1 bg-[#FFF8F3]" contentContainerClassName="pb-12">
      <BrandHero
        compact
        eyebrow="Support"
        title="Bize ulaşın"
        subtitle="Destek, iş birliği ve kurumsal iletişim."
      />

      <View className="-mt-4 rounded-t-3xl bg-[#FFF8F3] px-4 pt-6">
        <UiCard className="mb-4">
          <Text className="text-sm leading-5 text-stone-600">
            Baret, Trunçgil Teknoloji Yaz Staj Programı kapsamında geliştirilen bir
            pazaryeri uygulamasıdır. Genel sorular için Trunçgil web sitesini,
            uygulama politikaları için landing sayfalarını kullanın.
          </Text>
        </UiCard>

        <UiCard className="mb-4" padded={false}>
          <ContactRow
            icon="business-outline"
            title="Trunçgil Teknoloji"
            subtitle={TRUNCGIL_URL.replace(/^https?:\/\//, '')}
            onPress={() => void Linking.openURL(TRUNCGIL_URL)}
          />
          <ContactRow
            icon="globe-outline"
            title="Baret web sitesi"
            subtitle={getLandingUrl().replace(/^https?:\/\//, '')}
            onPress={() => void Linking.openURL(getLandingUrl())}
          />
          <ContactRow
            icon="logo-google-playstore"
            title="Google Play"
            subtitle="com.baret.app"
            onPress={() => void Linking.openURL(PLAY_STORE_URL)}
          />
          <ContactRow
            icon="shield-outline"
            title="Gizlilik"
            subtitle="privacy.html"
            onPress={() => void Linking.openURL(landingPath('/privacy.html'))}
          />
          <ContactRow
            icon="trash-outline"
            title="Hesap silme"
            subtitle="account-deletion.html"
            onPress={() => void Linking.openURL(landingPath('/account-deletion.html'))}
            last
          />
        </UiCard>
      </View>
    </ScrollView>
  );
}

function ContactRow({
  icon,
  title,
  subtitle,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-4 py-3.5 ${
        last ? '' : 'border-b border-stone-100'
      }`}
    >
      <View
        className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: ui.brandSoft }}
      >
        <Ionicons name={icon} size={20} color={ui.brand} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-stone-900">{title}</Text>
        <Text className="mt-0.5 text-xs text-stone-500">{subtitle}</Text>
      </View>
      <Ionicons name="open-outline" size={18} color="#a8a29e" />
    </Pressable>
  );
}

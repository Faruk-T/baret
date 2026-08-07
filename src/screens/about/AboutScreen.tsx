import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { BrandHero } from '../../components/ui/BrandHero';
import { UiCard } from '../../components/ui/UiCard';
import {
  CREDITS,
  TRUNCGIL_URL,
  getAppVersionLabel,
  getLandingUrl,
  landingPath,
} from '../../constants/about';
import type { AboutStackParamList } from '../../types/navigation.types';
import { ui } from '../../theme/ui';

type Nav = NativeStackNavigationProp<AboutStackParamList, 'About'>;

export function AboutScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView className="flex-1 bg-[#FFF8F3]" contentContainerClassName="pb-12">
      <BrandHero
        compact
        eyebrow="Baret"
        title="Hakkında"
        subtitle="Trunçgil Teknoloji Yaz Staj Programı kapsamında geliştirildi."
      />

      <View className="-mt-4 rounded-t-3xl bg-[#FFF8F3] px-4 pt-6">
        <UiCard className="mb-4">
          <Text className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Uygulama
          </Text>
          <Text className="mt-2 text-2xl font-bold text-stone-900">Baret</Text>
          <Text className="mt-1 text-sm text-stone-500">
            İnşaat & nalbur pazaryeri · {getAppVersionLabel()}
          </Text>
          <Text className="mt-1 text-xs text-stone-400">
            {Constants.expoConfig?.android?.package ?? 'com.baret.app'}
          </Text>
        </UiCard>

        <Text className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-stone-500">
          Credits
        </Text>
        <UiCard className="mb-4">
          {CREDITS.map((row, i) => (
            <View
              key={row.role}
              className={`flex-row items-start justify-between py-3 ${
                i < CREDITS.length - 1 ? 'border-b border-stone-100' : ''
              }`}
            >
              <Text className="flex-1 pr-3 text-sm text-stone-500">{row.role}</Text>
              <Text className="flex-1 text-right text-sm font-semibold text-stone-900">
                {row.name}
              </Text>
            </View>
          ))}
        </UiCard>

        <Text className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-stone-500">
          Bağlantılar
        </Text>
        <UiCard className="mb-4 overflow-hidden" padded={false}>
          <LinkRow
            icon="globe-outline"
            title="Web sitesi"
            subtitle={getLandingUrl().replace(/^https?:\/\//, '')}
            onPress={() => void Linking.openURL(getLandingUrl())}
          />
          <LinkRow
            icon="business-outline"
            title="Trunçgil Teknoloji"
            subtitle="www.truncgil.com"
            onPress={() => void Linking.openURL(TRUNCGIL_URL)}
          />
          <LinkRow
            icon="mail-outline"
            title="Bize ulaşın"
            subtitle="İletişim ve destek"
            onPress={() => navigation.navigate('Contact')}
          />
          <LinkRow
            icon="document-text-outline"
            title="Açık kaynak lisansları"
            subtitle="Licenses"
            onPress={() => navigation.navigate('Licenses')}
          />
          <LinkRow
            icon="shield-checkmark-outline"
            title="Gizlilik politikası"
            subtitle="privacy"
            onPress={() => void Linking.openURL(landingPath('/privacy.html'))}
            last
          />
        </UiCard>
      </View>
    </ScrollView>
  );
}

function LinkRow({
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
      <Ionicons name="chevron-forward" size={18} color="#a8a29e" />
    </Pressable>
  );
}

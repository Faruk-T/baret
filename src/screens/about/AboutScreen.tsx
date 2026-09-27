import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { UiCard } from '../../components/ui/UiCard';
import {
  CREDITS,
  OSS_LICENSES,
  TRUNCGIL_URL,
  getAppVersionLabel,
  getLandingUrl,
  landingPath,
} from '../../constants/about';
import type { AboutStackParamList } from '../../types/navigation.types';
import { ui } from '../../theme/ui';

type Nav = NativeStackNavigationProp<AboutStackParamList, 'About'>;

/**
 * Credits layout aligned with Truncgil sample apps:
 * Project Team → website → version → Contributors → Open Source Licenses.
 */
export function AboutScreen() {
  const navigation = useNavigation<Nav>();
  const previewLicenses = OSS_LICENSES.slice(0, 4);

  return (
    <ScrollView className="flex-1 bg-[#0B1220]" contentContainerClassName="pb-14">
      <View className="items-center px-6 pb-8 pt-10">
        <Image
          source={require('../../../assets/icon.png')}
          style={{ width: 88, height: 88, borderRadius: 22 }}
        />
        <Text className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
          Project Team
        </Text>
        <Text className="mt-2 text-center text-2xl font-bold text-white">
          Trunçgil Teknoloji
        </Text>
        <Pressable
          className="mt-3 flex-row items-center gap-1.5"
          onPress={() => void Linking.openURL(TRUNCGIL_URL)}
        >
          <Ionicons name="link-outline" size={16} color={ui.brand} />
          <Text className="text-base font-semibold text-brand">www.truncgil.com</Text>
        </Pressable>
        <Text className="mt-3 text-sm text-stone-400">
          App Version: {getAppVersionLabel()}
        </Text>
        <Text className="mt-1 text-xs text-stone-500">Baret · inşaat & nalbur pazaryeri</Text>
      </View>

      <View className="px-4">
        <UiCard className="mb-3 border-stone-700 bg-[#151d2e]" style={{ borderColor: '#1f2a3d' }}>
          <View className="mb-3 flex-row items-center">
            <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-sky-500/20">
              <Ionicons name="people" size={18} color="#38bdf8" />
            </View>
            <Text className="text-base font-bold text-white">Contributors</Text>
          </View>
          {CREDITS.map((row, i) => (
            <View
              key={row.role}
              className={`flex-row items-start justify-between py-3 ${
                i < CREDITS.length - 1 ? 'border-b border-white/10' : ''
              }`}
            >
              <Text className="flex-1 pr-3 text-sm text-stone-400">{row.role}</Text>
              <Text className="flex-[1.2] text-right text-sm font-semibold text-white">
                {row.name}
              </Text>
            </View>
          ))}
        </UiCard>

        <UiCard className="mb-3 border-stone-700 bg-[#151d2e]" style={{ borderColor: '#1f2a3d' }}>
          <View className="mb-3 flex-row items-center">
            <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-teal-500/20">
              <Ionicons name="document-text" size={18} color="#2dd4bf" />
            </View>
            <Text className="flex-1 text-base font-bold text-white">Open Source Licenses</Text>
            <Pressable onPress={() => navigation.navigate('Licenses')}>
              <Text className="text-xs font-semibold text-brand">Tümü</Text>
            </Pressable>
          </View>
          {previewLicenses.map((row, i) => (
            <View
              key={row.name}
              className={`py-2.5 ${
                i < previewLicenses.length - 1 ? 'border-b border-white/10' : ''
              }`}
            >
              <Text className="text-sm font-semibold text-white">{row.name}</Text>
              <Text className="mt-0.5 text-xs text-stone-400">{row.license}</Text>
            </View>
          ))}
        </UiCard>

        <UiCard className="mb-3 border-stone-700 bg-[#151d2e]" padded={false} style={{ borderColor: '#1f2a3d' }}>
          <ActionRow
            icon="mail-outline"
            title="Contact Us"
            subtitle="Destek ve iletişim"
            onPress={() => navigation.navigate('Contact')}
          />
          <ActionRow
            icon="globe-outline"
            title="Baret website"
            subtitle={getLandingUrl().replace(/^https?:\/\//, '')}
            onPress={() => void Linking.openURL(getLandingUrl())}
          />
          <ActionRow
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            subtitle="Gizlilik"
            onPress={() => void Linking.openURL(landingPath('/privacy.html'))}
            last
          />
        </UiCard>
      </View>
    </ScrollView>
  );
}

function ActionRow({
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
        last ? '' : 'border-b border-white/10'
      }`}
    >
      <View
        className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: 'rgba(255,107,0,0.15)' }}
      >
        <Ionicons name={icon} size={20} color={ui.brand} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-white">{title}</Text>
        <Text className="mt-0.5 text-xs text-stone-400">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#64748b" />
    </Pressable>
  );
}

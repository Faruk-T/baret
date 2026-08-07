import { ScrollView, Text, View } from 'react-native';

import { BrandHero } from '../../components/ui/BrandHero';
import { UiCard } from '../../components/ui/UiCard';
import { OSS_LICENSES } from '../../constants/about';

export function LicensesScreen() {
  return (
    <ScrollView className="flex-1 bg-[#FFF8F3]" contentContainerClassName="pb-12">
      <BrandHero
        compact
        eyebrow="Legal"
        title="Lisanslar"
        subtitle="Baret açık kaynak bileşenler üzerine kuruludur."
      />

      <View className="-mt-4 rounded-t-3xl bg-[#FFF8F3] px-4 pt-6">
        <UiCard className="mb-4">
          <Text className="text-sm leading-5 text-stone-600">
            Aşağıdaki paketler kendi lisansları altında dağıtılır. Tam metinler
            ilgili npm paketinin depolandığı lisans dosyalarında yer alır.
          </Text>
        </UiCard>

        <UiCard className="mb-4">
          {OSS_LICENSES.map((row, i) => (
            <View
              key={row.name}
              className={`py-3 ${
                i < OSS_LICENSES.length - 1 ? 'border-b border-stone-100' : ''
              }`}
            >
              <Text className="text-base font-semibold text-stone-900">{row.name}</Text>
              <Text className="mt-0.5 text-sm text-brand">{row.license}</Text>
              {row.note ? (
                <Text className="mt-1 text-xs text-stone-500">{row.note}</Text>
              ) : null}
            </View>
          ))}
        </UiCard>

        <Text className="px-1 text-xs leading-5 text-stone-400">
          Baret mobil uygulaması © Trunçgil Teknoloji / Faruk Tazeoğlu. Tüm hakları
          saklıdır; ürün markası ve içerik ayrı şartlara tabidir.
        </Text>
      </View>
    </ScrollView>
  );
}

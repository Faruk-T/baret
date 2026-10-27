import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { PRODUCT_CATEGORIES } from '../../constants/categories';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

type WebPortalFooterProps = {
  onSelectCategory?: (category: string) => void;
  onNavigateTab?: (tab: 'catalog' | 'quick_order' | 'rfq' | 'orders' | 'profile') => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
};

export function WebPortalFooter({
  onSelectCategory,
  onNavigateTab,
  onOpenAuth,
}: WebPortalFooterProps) {
  const { isWeb, isDesktop } = useResponsiveLayout();

  if (!isWeb && !isDesktop) {
    return null;
  }

  return (
    <View className="bg-white border-t border-zinc-200 mt-12">
      {/* Trust & Guarantee Strip */}
      <View className="border-b border-zinc-200 bg-zinc-50/80 px-6 py-5">
        <View
          style={{ maxWidth: 1380, width: '100%', alignSelf: 'center' }}
          className="flex-row flex-wrap items-center justify-between gap-4"
        >
          {[
            {
              icon: 'check-circle' as const,
              title: 'Onaylı & Vergi Levhalı Tedarikçiler',
              desc: 'Sadece evrak kontrolünden geçmiş yetkili yapı marketler',
            },
            {
              icon: 'layers' as const,
              title: 'Otomatik Kademeli Toptan İskonto',
              desc: 'Miktar arttıkça sepette anında düşen birim fiyatlar',
            },
            {
              icon: 'truck' as const,
              title: 'Şantiye Sahasına Doğrudan Sevkiyat',
              desc: 'Vinçli araç, kamyon, kargo veya depodan teslim',
            },
            {
              icon: 'lock' as const,
              title: '6 Haneli Güvenli Teslimat Kodu',
              desc: 'Malzeme şantiyeye ulaşmadan sipariş kapanmaz',
            },
          ].map((item) => (
            <View
              key={item.title}
              className="flex-row items-center min-w-[260px] flex-1"
            >
              <View className="w-10 h-10 rounded-lg bg-zinc-900 items-center justify-center mr-3">
                <Feather name={item.icon} size={17} color="#FAFAFA" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-zinc-900">
                  {item.title}
                </Text>
                <Text className="text-[11px] text-zinc-500 mt-0.5">
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Main Footer Columns */}
      <View className="px-6 py-10">
        <View
          style={{ maxWidth: 1380, width: '100%', alignSelf: 'center' }}
          className="flex-row flex-wrap justify-between gap-8"
        >
          {/* Brand Column */}
          <View className="max-w-[340px] min-w-[260px]">
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 rounded-lg bg-zinc-900 items-center justify-center mr-2.5">
                <View className="w-3.5 h-3.5 rounded-sm bg-amber-500" />
              </View>
              <Text className="text-lg font-extrabold tracking-tight text-zinc-900">
                BARET
              </Text>
            </View>
            <Text className="text-xs leading-5 text-zinc-600 mb-4">
              Baret; inşaat firmaları, şantiye şefleri, müteahhitler ve bireysel
              alıcıları Türkiye genelindeki onaylı yapı market ve nalburlarla
              doğrudan buluşturan yeni nesil yapı malzemeleri tedarik platformudur.
            </Text>
            <Text className="text-[11px] font-semibold text-zinc-500">
              Müşteri & Tedarikçi Destek: destek@baret.app
            </Text>
          </View>

          {/* Categories Column (SEO Internal Links) */}
          <View className="min-w-[180px]">
            <Text className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-3">
              Yapı Malzemesi Kategorileri
            </Text>
            <View className="gap-2">
              {PRODUCT_CATEGORIES.slice(0, 6).map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => {
                    onSelectCategory?.(cat);
                    onNavigateTab?.('catalog');
                  }}
                >
                  <Text className="text-xs text-zinc-600 hover:text-zinc-900">
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Platform Navigation */}
          <View className="min-w-[180px]">
            <Text className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-3">
              Satınalma & Tedarik
            </Text>
            <View className="gap-2">
              <Pressable onPress={() => onNavigateTab?.('catalog')}>
                <Text className="text-xs text-zinc-600">Malzeme Kataloğu</Text>
              </Pressable>
              <Pressable onPress={() => onNavigateTab?.('quick_order')}>
                <Text className="text-xs text-zinc-600">
                  Toplu Sipariş & Kademeli Fiyat Tablosu
                </Text>
              </Pressable>
              <Pressable onPress={() => onNavigateTab?.('rfq')}>
                <Text className="text-xs text-zinc-600">
                  Şantiye Malzeme İhalesi (Teklif İste)
                </Text>
              </Pressable>
              <Pressable onPress={() => onNavigateTab?.('orders')}>
                <Text className="text-xs text-zinc-600">
                  Sipariş Takibi & Sevk İrsaliyesi
                </Text>
              </Pressable>
              <Pressable onPress={() => onOpenAuth?.('register')}>
                <Text className="text-xs font-semibold text-amber-700">
                  Tedarikçi / Nalbur Mağazası Aç →
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Corporate & Compliance */}
          <View className="min-w-[180px]">
            <Text className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-3">
              Kurumsal & Güvenlik
            </Text>
            <View className="gap-2">
              <Pressable onPress={() => onNavigateTab?.('profile')}>
                <Text className="text-xs text-zinc-600">
                  Kurumsal Fatura & Şantiye Yönetimi
                </Text>
              </Pressable>
              <Pressable onPress={() => onOpenAuth?.('login')}>
                <Text className="text-xs text-zinc-600">
                  Satıcı & Yönetici Girişi
                </Text>
              </Pressable>
              <Text className="text-xs text-zinc-500">
                KVKK & Gizlilik Aydınlatma Metni
              </Text>
              <Text className="text-xs text-zinc-500">
                Mesafeli Satış & Tedarik Sözleşmesi
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Copyright Bar */}
      <View className="border-t border-zinc-200 bg-zinc-50 px-6 py-4">
        <View
          style={{ maxWidth: 1380, width: '100%', alignSelf: 'center' }}
          className="flex-row flex-wrap items-center justify-between gap-2"
        >
          <Text className="text-xs text-zinc-500">
            © {new Date().getFullYear()} Baret Yapı Teknolojileri. Tüm hakları saklıdır.
          </Text>
          <Text className="text-xs text-zinc-400">
            Web • iOS App Store • Google Play Store
          </Text>
        </View>
      </View>
    </View>
  );
}


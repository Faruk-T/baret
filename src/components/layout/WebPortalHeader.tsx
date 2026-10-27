import { Feather } from '@expo/vector-icons';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

export type WebPortalActiveTab =
  | 'catalog'
  | 'quick_order'
  | 'rfq'
  | 'orders'
  | 'profile';

type WebPortalHeaderProps = {
  activeTab: WebPortalActiveTab;
  onSelectTab: (tab: WebPortalActiveTab) => void;
  searchValue?: string;
  onChangeSearch?: (value: string) => void;
  onOpenCart: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  cityLabel?: string;
};

export function WebPortalHeader({
  activeTab,
  onSelectTab,
  searchValue = '',
  onChangeSearch,
  onOpenCart,
  onOpenAuth,
  cityLabel,
}: WebPortalHeaderProps) {
  const { isWeb, isDesktop } = useResponsiveLayout();
  const { session, user } = useAuth();
  const { itemCount, totalAmount } = useCart();

  if (!isWeb && !isDesktop) {
    return null;
  }

  const navItems: Array<{
    key: WebPortalActiveTab;
    label: string;
    icon: keyof typeof Feather.glyphMap;
  }> = [
    { key: 'catalog', label: 'Malzeme Kataloğu', icon: 'grid' },
    { key: 'quick_order', label: 'Toplu Sipariş Tablosu', icon: 'list' },
    { key: 'rfq', label: 'Şantiye Teklif / İhale', icon: 'file-text' },
    { key: 'orders', label: 'Siparişlerim', icon: 'package' },
  ];

  return (
    <View className="bg-white border-b border-zinc-200">
      {/* Slim Executive Utility Strip */}
      <View className="bg-zinc-900 px-6 py-2">
        <View
          style={{ maxWidth: 1380, width: '100%', alignSelf: 'center' }}
          className="flex-row items-center justify-between flex-wrap gap-2"
        >
          <View className="flex-row items-center gap-4">
            <View className="flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-2" />
              <Text className="text-zinc-200 text-[11px] font-medium">
                Doğrudan Onaylı Yapı Market & Nalbur Tedariği
              </Text>
            </View>
            {isDesktop ? (
              <Text className="text-zinc-400 text-[11px]">
                Kademeli Toptan İskonto  •  Şantiye Sevkiyatı  •  Güvenli Teslim Kodu
              </Text>
            ) : null}
          </View>

          <View className="flex-row items-center gap-5">
            <View className="flex-row items-center">
              <Feather name="map-pin" size={11} color="#F59E0B" />
              <Text className="text-zinc-300 text-[11px] font-medium ml-1.5">
                Teslimat Bölgesi: {cityLabel?.trim() ? cityLabel : 'Tüm Türkiye'}
              </Text>
            </View>
            {!session ? (
              <Pressable
                onPress={() => onOpenAuth('register')}
                className="flex-row items-center"
              >
                <Text className="text-amber-400 text-[11px] font-semibold">
                  Tedarikçi / Nalbur Mağazası Aç →
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {/* Main White Architectural Header */}
      <View className="px-6 py-3.5 bg-white">
        <View
          style={{ maxWidth: 1380, width: '100%', alignSelf: 'center' }}
          className="flex-row items-center justify-between flex-wrap gap-4"
        >
          {/* Left: Clean Brand Wordmark */}
          <Pressable
            onPress={() => onSelectTab('catalog')}
            className="flex-row items-center mr-2"
          >
            <View className="w-10 h-10 rounded-xl bg-zinc-900 items-center justify-center mr-3">
              <View className="w-4 h-4 rounded-sm bg-amber-500" />
            </View>
            <View>
              <Text className="text-zinc-900 text-xl font-extrabold tracking-tight leading-5">
                BARET
              </Text>
              <Text className="text-zinc-500 text-[11px] font-medium mt-0.5">
                Yapı & Şantiye Tedarik Platformu
              </Text>
            </View>
          </Pressable>

          {/* Center: Clean Search Bar */}
          {onChangeSearch ? (
            <View className="flex-1 min-w-[240px] max-w-[460px] flex-row items-center bg-zinc-100 border border-zinc-200 rounded-xl px-3.5 h-10">
              <Feather name="search" size={15} color="#71717A" />
              <TextInput
                value={searchValue}
                onChangeText={onChangeSearch}
                placeholder="Çimento, demir, alçıpan, boya, SKU veya marka ara..."
                placeholderTextColor="#71717A"
                style={{ minWidth: 0 }}
                className="flex-1 ml-2.5 text-xs text-zinc-900"
              />
              {searchValue.length > 0 ? (
                <Pressable onPress={() => onChangeSearch('')} hitSlop={8}>
                  <Feather name="x" size={15} color="#71717A" />
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View className="flex-1" />
          )}

          {/* Center-Right: Clean Navigation Links */}
          <View className="flex-row items-center gap-1">
            {navItems.map((item) => {
              const active = activeTab === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => onSelectTab(item.key)}
                  className={`flex-row items-center px-3 py-2 rounded-lg ${
                    active ? 'bg-zinc-900' : 'bg-transparent'
                  }`}
                >
                  <Feather
                    name={item.icon}
                    size={14}
                    color={active ? '#FFFFFF' : '#52525B'}
                  />
                  <Text
                    className={`text-xs font-semibold ml-1.5 ${
                      active ? 'text-white' : 'text-zinc-700'
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Right: Cart & Account Actions */}
          <View className="flex-row items-center gap-2.5">
            <Pressable
              onPress={onOpenCart}
              className="flex-row items-center bg-zinc-100 border border-zinc-200 rounded-xl px-3.5 h-10"
            >
              <Feather name="shopping-bag" size={15} color="#18181B" />
              <Text className="text-zinc-900 text-xs font-bold ml-2">
                Sepet ({itemCount})
              </Text>
              {totalAmount > 0 ? (
                <View className="ml-2 pl-2 border-l border-zinc-300">
                  <Text className="text-amber-700 text-xs font-bold">
                    ₺{totalAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            {session ? (
              <Pressable
                onPress={() => onSelectTab('profile')}
                className={`flex-row items-center rounded-xl px-3.5 h-10 border ${
                  activeTab === 'profile'
                    ? 'bg-zinc-900 border-zinc-900'
                    : 'bg-white border-zinc-300'
                }`}
              >
                <Feather
                  name="user"
                  size={14}
                  color={activeTab === 'profile' ? '#FFFFFF' : '#18181B'}
                />
                <Text
                  className={`text-xs font-semibold ml-1.5 ${
                    activeTab === 'profile' ? 'text-white' : 'text-zinc-900'
                  }`}
                  numberOfLines={1}
                >
                  {user?.company_name || user?.full_name || 'Hesabım'}
                </Text>
              </Pressable>
            ) : (
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => onOpenAuth('login')}
                  className="flex-row items-center bg-white border border-zinc-300 rounded-xl px-3.5 h-10"
                >
                  <Text className="text-zinc-900 text-xs font-semibold">
                    Giriş Yap
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onOpenAuth('register')}
                  className="flex-row items-center bg-zinc-900 rounded-xl px-3.5 h-10"
                >
                  <Text className="text-white text-xs font-semibold">
                    Üye Ol
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

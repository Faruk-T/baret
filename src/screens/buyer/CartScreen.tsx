import { useEffect } from 'react';
import { Feather } from '@expo/vector-icons';
import { Alert, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';

import { ProductThumb } from '../../components/common/ProductThumb';
import { WebPortalFooter } from '../../components/layout/WebPortalFooter';
import {
  WebPortalHeader,
  type WebPortalActiveTab,
} from '../../components/layout/WebPortalHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useCart } from '../../context/CartContext';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import type {
  BuyerCartStackParamList,
  BuyerTabParamList,
} from '../../types/navigation.types';
import { formatTRY } from '../../utils/format';
import { usePageSeo } from '../../utils/seo';

type CartNav = CompositeNavigationProp<
  NativeStackNavigationProp<BuyerCartStackParamList, 'CartList'>,
  BottomTabNavigationProp<BuyerTabParamList>
>;

export function CartScreen() {
  const navigation = useNavigation<CartNav>();
  const { isDesktop } = useResponsiveLayout();
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    totalAmount,
    itemCount,
    isReady,
  } = useCart();

  usePageSeo({
    title: `Sepetim (${itemCount}) | Baret Yapı & Şantiye Tedariği`,
    description:
      'Şantiye ve yapı malzemesi sepetiniz, kademeli toptan fiyat özeti ve sevkiyat adımı.',
    canonicalPath: '/cart',
  });

  useEffect(() => {
    navigation.setOptions({
      headerShown: !isDesktop,
    });
  }, [navigation, isDesktop]);

  const handlePortalTab = (tab: WebPortalActiveTab) => {
    if (tab === 'catalog' || tab === 'quick_order') {
      navigation.navigate('Home');
    } else if (tab === 'rfq') {
      navigation.navigate('Rfq');
    } else if (tab === 'orders') {
      navigation.navigate('Orders');
    } else if (tab === 'profile') {
      navigation.navigate('Profile');
    }
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    const rootNav = navigation.getParent()?.getParent() as any;
    if (rootNav) {
      rootNav.navigate('Auth', {
        screen: mode === 'register' ? 'RoleSelect' : 'Login',
      });
    }
  };

  const confirmClear = () => {
    Alert.alert('Sepeti temizle', 'Tüm ürünler sepetten kaldırılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Temizle', style: 'destructive', onPress: clearCart },
    ]);
  };

  if (!isReady) {
    return <View className="flex-1 bg-[#FAFAFA]" />;
  }

  if (items.length === 0) {
    return (
      <View className="flex-1 bg-[#FAFAFA]">
        {isDesktop ? (
          <WebPortalHeader
            activeTab="catalog"
            onSelectTab={handlePortalTab}
            onOpenCart={() => {}}
            onOpenAuth={openAuthModal}
          />
        ) : null}
        <EmptyState
          icon="cart-outline"
          title="Sepetiniz boş"
          description="Katalogdan veya Toplu Sipariş Tablosundan malzeme seçip sepete ekleyebilirsiniz."
          actionLabel="Malzeme Kataloğuna Git"
          onAction={() => navigation.navigate('Home')}
        />
      </View>
    );
  }

  if (isDesktop) {
    return (
      <View className="flex-1 bg-[#FAFAFA]">
        <WebPortalHeader
          activeTab="catalog"
          onSelectTab={handlePortalTab}
          onOpenCart={() => {}}
          onOpenAuth={openAuthModal}
        />

        <ScrollView className="flex-1">
          <View
            style={{ maxWidth: 1200, width: '100%', alignSelf: 'center' }}
            className="px-6 pt-8"
          >
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text className="text-2xl font-extrabold text-zinc-900">
                  Alışveriş Sepeti ({itemCount} Ürün)
                </Text>
                <Text className="text-xs text-zinc-500 mt-1">
                  Tedarikçi Mağaza: {items[0]?.storeName}
                </Text>
              </View>
              <Pressable
                onPress={confirmClear}
                className="flex-row items-center rounded-lg border border-zinc-200 bg-white px-3.5 py-2"
              >
                <Feather name="trash-2" size={14} color="#DC2626" />
                <Text className="text-xs font-semibold text-red-600 ml-1.5">
                  Sepeti Temizle
                </Text>
              </Pressable>
            </View>

            <View className="flex-row items-start gap-6">
              {/* Left Cart Items List */}
              <View className="flex-1 rounded-xl border border-zinc-200 bg-white overflow-hidden">
                {items.map((item, idx) => {
                  const lineTotal = item.price * item.quantity;
                  const unitLabel = item.unit ?? 'adet';
                  return (
                    <View
                      key={item.productId}
                      className={`flex-row items-center p-4 ${
                        idx < items.length - 1 ? 'border-b border-zinc-100' : ''
                      }`}
                    >
                      <ProductThumb uri={item.imageUrl} size={68} />
                      <View className="flex-1 ml-3" style={{ minWidth: 0 }}>
                        <Text
                          className="text-sm font-bold text-zinc-900"
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>
                        <Text className="text-xs text-zinc-500 mt-0.5">
                          Birim Fiyat: {formatTRY(item.price)} / {unitLabel}
                          {item.basePrice > item.price
                            ? ` (Toptan İskontolu — Liste: ${formatTRY(item.basePrice)})`
                            : ''}
                        </Text>
                      </View>

                      <View className="flex-row items-center mx-4">
                        <Pressable
                          className="h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50"
                          onPress={() =>
                            updateQuantity(item.productId, item.quantity - 1)
                          }
                        >
                          <Text className="text-base font-bold text-zinc-800">
                            −
                          </Text>
                        </Pressable>
                        <Text className="mx-3 min-w-[32px] text-center text-sm font-bold text-zinc-900">
                          {item.quantity} {unitLabel}
                        </Text>
                        <Pressable
                          className="h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50"
                          onPress={() => {
                            try {
                              updateQuantity(item.productId, item.quantity + 1);
                            } catch (error) {
                              Alert.alert(
                                'Stok',
                                error instanceof Error
                                  ? error.message
                                  : 'Miktar güncellenemedi.'
                              );
                            }
                          }}
                        >
                          <Text className="text-base font-bold text-zinc-800">
                            +
                          </Text>
                        </Pressable>
                      </View>

                      <View className="w-32 items-end">
                        <Text className="text-sm font-extrabold text-zinc-900">
                          {formatTRY(lineTotal)}
                        </Text>
                        <Pressable
                          onPress={() => removeItem(item.productId)}
                          className="mt-1"
                        >
                          <Text className="text-xs font-medium text-red-600">
                            Kaldır
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Right Summary Card */}
              <View
                style={{ width: 340 }}
                className="rounded-xl border border-zinc-200 bg-white p-5"
              >
                <Text className="text-sm font-bold uppercase tracking-wider text-zinc-900 mb-4">
                  Sipariş Özeti
                </Text>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs text-zinc-500">Kalem Sayısı</Text>
                  <Text className="text-xs font-semibold text-zinc-800">
                    {items.length} kalem ({itemCount} birim)
                  </Text>
                </View>
                <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-zinc-100">
                  <Text className="text-xs text-zinc-500">Tedarikçi</Text>
                  <Text
                    className="text-xs font-semibold text-zinc-800 max-w-[190px]"
                    numberOfLines={1}
                  >
                    {items[0]?.storeName}
                  </Text>
                </View>

                <View className="flex-row items-baseline justify-between mb-5">
                  <Text className="text-sm font-bold text-zinc-900">
                    Genel Toplam
                  </Text>
                  <Text className="text-2xl font-extrabold text-zinc-900">
                    {formatTRY(totalAmount)}
                  </Text>
                </View>

                <Pressable
                  onPress={() => navigation.navigate('Checkout')}
                  className="rounded-xl bg-zinc-900 py-3.5 items-center flex-row justify-center"
                >
                  <Text className="text-sm font-bold text-white">
                    Teslimat & Onay Adımına Geç
                  </Text>
                  <Feather
                    name="arrow-right"
                    size={15}
                    color="#FFFFFF"
                    style={{ marginLeft: 8 }}
                  />
                </Pressable>
              </View>
            </View>
          </View>

          <WebPortalFooter
            onNavigateTab={handlePortalTab}
            onOpenAuth={openAuthModal}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="flex-row items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <View className="flex-1 pr-3">
          <Text className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            Sepet
          </Text>
          <Text className="mt-0.5 text-sm font-semibold text-zinc-800">
            {itemCount} adet · {items[0]?.storeName}
          </Text>
        </View>
        <Pressable onPress={confirmClear}>
          <Text className="text-sm font-bold text-red-600">Temizle</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        contentContainerClassName="px-4 py-3"
        renderItem={({ item }) => {
          const lineTotal = item.price * item.quantity;
          return (
            <View className="mb-3 overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <View className="flex-row items-start p-3">
                <ProductThumb uri={item.imageUrl} size={72} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    className="mb-1 text-sm font-bold text-zinc-900"
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  <Text
                    className="mb-0.5 text-xs text-zinc-500"
                    numberOfLines={1}
                  >
                    {item.storeName}
                  </Text>
                  <Text className="mb-1 text-sm font-bold text-zinc-900">
                    {formatTRY(item.price)}
                  </Text>
                  <Text className="mb-3 text-xs text-zinc-500">
                    {item.quantity} adet · Satır {formatTRY(lineTotal)}
                  </Text>
                  <View className="flex-row items-center">
                    <Pressable
                      className="h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50"
                      onPress={() =>
                        updateQuantity(item.productId, item.quantity - 1)
                      }
                    >
                      <Text className="text-base text-zinc-800">−</Text>
                    </Pressable>
                    <Text className="mx-3 min-w-[24px] text-center text-sm font-bold text-zinc-900">
                      {item.quantity}
                    </Text>
                    <Pressable
                      className="h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50"
                      onPress={() => {
                        try {
                          updateQuantity(item.productId, item.quantity + 1);
                        } catch (error) {
                          const message =
                            error instanceof Error
                              ? error.message
                              : 'Miktar güncellenemedi.';
                          Alert.alert('Stok', message);
                        }
                      }}
                    >
                      <Text className="text-base text-zinc-800">+</Text>
                    </Pressable>
                    <Pressable
                      className="ml-auto px-1"
                      onPress={() => removeItem(item.productId)}
                    >
                      <Text className="text-xs font-bold text-red-600">
                        Kaldır
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />

      <View className="border-t border-zinc-200 bg-white px-4 py-4">
        <View className="mb-3 flex-row items-end justify-between">
          <Text className="text-sm text-zinc-500">Toplam</Text>
          <Text className="text-2xl font-bold text-zinc-900">
            {formatTRY(totalAmount)}
          </Text>
        </View>
        <PrimaryButton
          label="Siparişe geç"
          onPress={() => navigation.navigate('Checkout')}
        />
      </View>
    </View>
  );
}

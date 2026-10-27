import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { StarRating } from '../../components/common/StarRating';
import { WebPortalFooter } from '../../components/layout/WebPortalFooter';
import {
  WebPortalHeader,
  type WebPortalActiveTab,
} from '../../components/layout/WebPortalHeader';
import {
  CartStoreConflictError,
  useCart,
  type CartProductInput,
} from '../../context/CartContext';
import { DELIVERY_OPTION_LABELS } from '../../constants/enums';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { getCatalogProduct, type CatalogProduct } from '../../services/catalog';
import {
  getStoreRatingSummary,
  listStoreReviews,
  type ReviewWithBuyer,
} from '../../services/reviews';
import type { BuyerHomeStackParamList } from '../../types/navigation.types';
import {
  distanceMeters,
  formatDistance,
  getCurrentCoords,
} from '../../utils/geo';
import {
  getBulkDiscountPercent,
  normalizeBulkTiers,
  resolveEffectiveUnitPrice,
} from '../../utils/pricing';
import { usePageSeo } from '../../utils/seo';

type Props = NativeStackScreenProps<BuyerHomeStackParamList, 'ProductDetail'>;

export function ProductDetailScreen({ navigation, route }: Props) {
  const { productId } = route.params;
  const { addItem, clearCart, items } = useCart();
  const { isDesktop } = useResponsiveLayout();

  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingSummary, setRatingSummary] = useState({ average: 0, count: 0 });
  const [storeReviews, setStoreReviews] = useState<ReviewWithBuyer[]>([]);
  const [distanceLabel, setDistanceLabel] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerShown: !isDesktop,
    });
  }, [navigation, isDesktop]);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setDistanceLabel(null);
      const row = await getCatalogProduct(productId);
      if (!row) {
        Alert.alert('Bulunamadı', 'Ürün bulunamadı veya satışta değil.');
        navigation.goBack();
        return;
      }
      setProduct(row);
      const minQty = Math.max(1, row.min_order_qty ?? 1);
      setQuantity((q) => Math.min(Math.max(minQty, q), Math.max(1, row.stock)));
      const [summary, reviews] = await Promise.all([
        getStoreRatingSummary(row.store_id).catch(() => ({
          average: 0,
          count: 0,
        })),
        listStoreReviews(row.store_id).catch(() => [] as ReviewWithBuyer[]),
      ]);
      setRatingSummary(summary);
      setStoreReviews(reviews.slice(0, 5));

      const lat = row.store.latitude;
      const lng = row.store.longitude;
      if (lat != null && lng != null) {
        try {
          const me = await getCurrentCoords();
          setDistanceLabel(
            formatDistance(
              distanceMeters(me, { latitude: lat, longitude: lng })
            )
          );
        } catch {
          // Permission denied or GPS unavailable — distance stays hidden.
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Ürün yüklenemedi.';
      Alert.alert('Hata', message);
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }, [productId, navigation]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const productJsonLd = useMemo(() => {
    if (!product) return undefined;
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      sku: product.sku || product.id,
      description: product.description || product.name,
      image: product.image_url || undefined,
      brand: product.brand
        ? { '@type': 'Brand', name: product.brand }
        : undefined,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'TRY',
        price: Number(product.price),
        availability:
          product.stock > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: product.store.name,
        },
      },
    };
  }, [product]);

  usePageSeo({
    title: product
      ? `${product.name} Fiyatı ve Toptan Şantiye Tedariği | Baret`
      : 'Ürün Detayı | Baret',
    description: product?.description || 'Baret onaylı yapı market ve nalbur ürünü.',
    canonicalPath: `/product/${productId}`,
    jsonLd: productJsonLd,
  });

  const inCartQty =
    items.find((item) => item.productId === productId)?.quantity ?? 0;

  const toCartInput = (row: CatalogProduct): CartProductInput => ({
    id: row.id,
    store_id: row.store_id,
    storeName: row.store.name,
    name: row.name,
    price: Number(row.price),
    image_url: row.image_url,
    stock: row.stock,
    delivery_options: row.delivery_options,
    unit: row.unit ?? 'adet',
    min_order_qty: row.min_order_qty ?? 1,
    bulk_pricing: row.bulk_pricing ?? [],
  });

  const confirmAdded = (name: string) => {
    Alert.alert('Sepete eklendi', `${name} sepete eklendi.`, [
      { text: 'Alışverişe devam', style: 'cancel' },
      {
        text: 'Sepete git',
        onPress: () => (navigation.getParent() as any)?.navigate('Cart'),
      },
    ]);
  };

  const handleAddToCart = () => {
    if (!product) return;
    try {
      addItem(toCartInput(product), quantity);
      confirmAdded(product.name);
    } catch (error) {
      if (error instanceof CartStoreConflictError) {
        Alert.alert('Farklı tedarikçi mağazası', error.message, [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Sepeti sıfırla ve ekle',
            style: 'destructive',
            onPress: () => {
              try {
                clearCart();
                addItem(toCartInput(product), quantity);
                confirmAdded(product.name);
              } catch (inner) {
                const message =
                  inner instanceof Error
                    ? inner.message
                    : 'Sepete eklenemedi.';
                Alert.alert('Sepet', message);
              }
            },
          },
        ]);
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Sepete eklenemedi.';
      Alert.alert('Sepet', message);
    }
  };

  const storeHasCoords =
    product?.store.latitude != null && product?.store.longitude != null;

  const handleRefreshDistance = async () => {
    if (!product?.store.latitude || !product?.store.longitude) return;
    try {
      setIsLocating(true);
      const me = await getCurrentCoords();
      setDistanceLabel(
        formatDistance(
          distanceMeters(me, {
            latitude: product.store.latitude,
            longitude: product.store.longitude,
          })
        )
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Konum alınamadı.';
      Alert.alert('Konum', message);
    } finally {
      setIsLocating(false);
    }
  };

  const handlePortalTab = (tab: WebPortalActiveTab) => {
    const tabNav = navigation.getParent() as any;
    if (tab === 'catalog' || tab === 'quick_order') {
      navigation.navigate('HomeList');
    } else if (tab === 'rfq') {
      tabNav?.navigate('Rfq');
    } else if (tab === 'orders') {
      tabNav?.navigate('Orders');
    } else if (tab === 'profile') {
      tabNav?.navigate('Profile');
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

  if (isLoading || !product) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAFAFA]">
        <ActivityIndicator size="large" color="#18181B" />
      </View>
    );
  }

  const outOfStock = product.stock < 1;
  const unitLabel = product.unit ?? 'adet';
  const minQty = Math.max(1, product.min_order_qty ?? 1);
  const bulkTiers = normalizeBulkTiers(product.bulk_pricing);
  const effectiveUnitPrice = resolveEffectiveUnitPrice(
    Number(product.price),
    quantity,
    bulkTiers
  );
  const discountPct = getBulkDiscountPercent(
    Number(product.price),
    effectiveUnitPrice
  );
  const linePreview = effectiveUnitPrice * quantity;

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      {isDesktop ? (
        <WebPortalHeader
          activeTab="catalog"
          onSelectTab={handlePortalTab}
          onOpenCart={() => (navigation.getParent() as any)?.navigate('Cart')}
          onOpenAuth={openAuthModal}
          cityLabel={product.store.city}
        />
      ) : null}

      <ScrollView className="flex-1" contentContainerClassName="pb-10">
        {isDesktop ? (
          <View
            style={{ maxWidth: 1240, width: '100%', alignSelf: 'center' }}
            className="px-6 pt-5 pb-2 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => navigation.goBack()}
                className="flex-row items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5"
              >
                <Feather name="arrow-left" size={14} color="#18181B" />
                <Text className="text-xs font-semibold text-zinc-800 ml-1.5">
                  Kataloğa Dön
                </Text>
              </Pressable>
              <Text className="text-xs text-zinc-400">/</Text>
              <Text className="text-xs text-zinc-500">
                {product.category || 'Yapı Malzemeleri'}
              </Text>
              <Text className="text-xs text-zinc-400">/</Text>
              <Text
                className="text-xs font-semibold text-zinc-800 max-w-[360px]"
                numberOfLines={1}
              >
                {product.name}
              </Text>
            </View>
          </View>
        ) : null}

        <View
          style={
            isDesktop
              ? {
                  maxWidth: 1240,
                  width: '100%',
                  alignSelf: 'center',
                  paddingHorizontal: 24,
                  paddingTop: 12,
                }
              : undefined
          }
          className={isDesktop ? 'flex-row items-start gap-8' : ''}
        >
          {/* Image Column */}
          <View className={isDesktop ? 'w-[460px]' : 'w-full'}>
            {product.image_url ? (
              <Image
                source={{ uri: product.image_url }}
                className={
                  isDesktop
                    ? 'h-[420px] w-full rounded-2xl border border-zinc-200 bg-zinc-100'
                    : 'h-72 w-full bg-zinc-100'
                }
                resizeMode="cover"
              />
            ) : (
              <View
                className={
                  isDesktop
                    ? 'h-[420px] w-full rounded-2xl border border-zinc-200 items-center justify-center bg-zinc-100'
                    : 'h-72 w-full items-center justify-center bg-zinc-100'
                }
              >
                <Feather name="package" size={36} color="#71717A" />
              </View>
            )}
          </View>

          {/* Details Column */}
          <View
            className={
              isDesktop
                ? 'flex-1 bg-white rounded-2xl border border-zinc-200 p-7'
                : 'px-5 py-5 bg-white'
            }
          >
            <View className="flex-row flex-wrap items-center gap-2 mb-2.5">
              {product.category ? (
                <View className="rounded-md bg-zinc-900 px-2.5 py-1">
                  <Text className="text-[11px] font-semibold text-white">
                    {product.category}
                  </Text>
                </View>
              ) : null}
              {product.brand ? (
                <View className="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1">
                  <Text className="text-[11px] font-bold text-amber-800">
                    {product.brand}
                  </Text>
                </View>
              ) : null}
              {product.sku ? (
                <Text className="text-xs font-mono text-zinc-400">
                  SKU: {product.sku}
                </Text>
              ) : null}
            </View>

            <Text className="mb-3 text-2xl font-extrabold text-zinc-900 leading-8">
              {product.name}
            </Text>

            <View className="mb-4 flex-row items-baseline flex-wrap gap-2">
              <Text className="text-3xl font-extrabold text-zinc-900">
                ₺
                {effectiveUnitPrice.toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                })}
              </Text>
              <Text className="text-sm font-medium text-zinc-500">
                / {unitLabel} (KDV Dahil)
              </Text>
              {discountPct > 0 ? (
                <View className="rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1">
                  <Text className="text-xs font-bold text-emerald-800">
                    %{discountPct} Toptan İskonto Uygulandı (Liste: ₺
                    {Number(product.price).toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                    })}
                    )
                  </Text>
                </View>
              ) : null}
            </View>

            {/* B2B Bulk Pricing Table */}
            {bulkTiers.length > 0 ? (
              <View className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <View className="flex-row items-center mb-2.5">
                  <Feather name="layers" size={14} color="#047857" />
                  <Text className="text-xs font-bold uppercase tracking-wider text-zinc-800 ml-1.5">
                    Kademeli Toptan Birim Fiyatlar (Seçmek için tıklayın)
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <Pressable
                    onPress={() => setQuantity(minQty)}
                    className={`rounded-lg border px-3.5 py-2 ${
                      quantity < bulkTiers[0].min_qty
                        ? 'border-zinc-900 bg-zinc-900'
                        : 'border-zinc-200 bg-white'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-medium ${
                        quantity < bulkTiers[0].min_qty
                          ? 'text-zinc-300'
                          : 'text-zinc-500'
                      }`}
                    >
                      1 – {bulkTiers[0].min_qty - 1} {unitLabel}
                    </Text>
                    <Text
                      className={`text-sm font-bold ${
                        quantity < bulkTiers[0].min_qty
                          ? 'text-white'
                          : 'text-zinc-900'
                      }`}
                    >
                      ₺
                      {Number(product.price).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                  </Pressable>
                  {bulkTiers.map((tier) => {
                    const active = quantity >= tier.min_qty;
                    return (
                      <Pressable
                        key={tier.min_qty}
                        onPress={() =>
                          setQuantity(Math.min(product.stock, tier.min_qty))
                        }
                        className={`rounded-lg border px-3.5 py-2 ${
                          active
                            ? 'border-emerald-700 bg-emerald-700'
                            : 'border-zinc-200 bg-white'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-semibold ${
                            active ? 'text-emerald-100' : 'text-emerald-800'
                          }`}
                        >
                          {tier.min_qty}+ {unitLabel} Alımda
                        </Text>
                        <Text
                          className={`text-sm font-extrabold ${
                            active ? 'text-white' : 'text-zinc-900'
                          }`}
                        >
                          ₺
                          {tier.unit_price.toLocaleString('tr-TR', {
                            minimumFractionDigits: 2,
                          })}{' '}
                          / {unitLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Store Info Box */}
            <View className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 flex-row items-center justify-between flex-wrap gap-2">
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-lg bg-zinc-900 items-center justify-center mr-3">
                  <Feather name="shield" size={16} color="#FAFAFA" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-zinc-900">
                    {product.store.name}
                  </Text>
                  <Text className="text-[11px] text-zinc-500">
                    Onaylı Tedarikçi • {product.store.city}
                    {product.store.district
                      ? ` / ${product.store.district}`
                      : ''}
                    {distanceLabel ? ` • Uzaklık: ${distanceLabel}` : ''}
                  </Text>
                </View>
              </View>

              {storeHasCoords && !distanceLabel ? (
                <Pressable
                  onPress={() => void handleRefreshDistance()}
                  disabled={isLocating}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5"
                >
                  <Text className="text-xs font-semibold text-zinc-800">
                    {isLocating ? 'Hesaplanıyor...' : 'Mesafe Hesapla'}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {product.description ? (
              <Text className="mb-4 text-sm leading-6 text-zinc-600">
                {product.description}
              </Text>
            ) : null}

            <View className="mb-4 flex-row flex-wrap items-center gap-2">
              <View className="rounded-md bg-zinc-100 px-2.5 py-1">
                <Text
                  className={`text-xs font-semibold ${
                    outOfStock ? 'text-red-600' : 'text-zinc-800'
                  }`}
                >
                  {outOfStock
                    ? 'Stokta yok'
                    : `Stok: ${product.stock} ${unitLabel}`}
                </Text>
              </View>
              {product.delivery_options.map((option) => (
                <View
                  key={option}
                  className="rounded-md bg-zinc-100 px-2.5 py-1"
                >
                  <Text className="text-xs font-medium text-zinc-700">
                    {DELIVERY_OPTION_LABELS[option]}
                  </Text>
                </View>
              ))}
            </View>

            {!outOfStock ? (
              <View className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <Text className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                  Sipariş Miktarı ({unitLabel})
                </Text>
                <View className="flex-row items-center flex-wrap gap-2">
                  <Pressable
                    className="h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 bg-white"
                    onPress={() => setQuantity((q) => Math.max(minQty, q - 1))}
                  >
                    <Text className="text-lg font-bold text-zinc-800">−</Text>
                  </Pressable>
                  <TextInput
                    value={String(quantity)}
                    onChangeText={(v) => {
                      const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
                      if (!Number.isNaN(n)) {
                        setQuantity(Math.min(product.stock, Math.max(1, n)));
                      }
                    }}
                    keyboardType="number-pad"
                    style={{ minWidth: 0 }}
                    className="h-10 w-20 rounded-lg border border-zinc-300 bg-white text-center text-sm font-bold text-zinc-900"
                  />
                  <Pressable
                    className="h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 bg-white"
                    onPress={() =>
                      setQuantity((q) => Math.min(product.stock, q + 1))
                    }
                  >
                    <Text className="text-lg font-bold text-zinc-800">+</Text>
                  </Pressable>

                  {[10, 25, 50, 100].map((step) =>
                    product.stock >= step ? (
                      <Pressable
                        key={step}
                        onPress={() =>
                          setQuantity((q) => Math.min(product.stock, q + step))
                        }
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2"
                      >
                        <Text className="text-xs font-bold text-zinc-800">
                          +{step}
                        </Text>
                      </Pressable>
                    ) : null
                  )}
                </View>

                <View className="mt-4 pt-3 border-t border-zinc-200 flex-row items-center justify-between flex-wrap gap-3">
                  <View>
                    <Text className="text-xs text-zinc-500">
                      Toplam Tutar ({quantity} {unitLabel})
                    </Text>
                    <Text className="text-xl font-extrabold text-zinc-900">
                      ₺
                      {linePreview.toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                  </View>

                  {isDesktop ? (
                    <Pressable
                      onPress={handleAddToCart}
                      className="flex-row items-center rounded-xl bg-zinc-900 px-6 py-3.5"
                    >
                      <Feather
                        name="shopping-cart"
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text className="text-sm font-bold text-white ml-2">
                        Sepete Ekle
                        {inCartQty > 0 ? ` (Sepette: ${inCartQty})` : ''}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}

            {ratingSummary.count > 0 || storeReviews.length > 0 ? (
              <View className="mt-6 pt-5 border-t border-zinc-200">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Mağaza Değerlendirmeleri
                  </Text>
                  <View className="flex-row items-center">
                    <StarRating
                      value={Math.round(ratingSummary.average)}
                      readonly
                      size="sm"
                    />
                    <Text className="ml-2 text-xs text-zinc-600">
                      {ratingSummary.average} ({ratingSummary.count} yorum)
                    </Text>
                  </View>
                </View>
                {storeReviews.map((review) => (
                  <View
                    key={review.id}
                    className="mb-2.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                  >
                    <View className="mb-1 flex-row items-center justify-between">
                      <Text className="text-xs font-semibold text-zinc-800">
                        Onaylı Alıcı
                      </Text>
                      <StarRating value={review.rating} readonly size="sm" />
                    </View>
                    {review.comment ? (
                      <Text className="text-xs text-zinc-600">
                        {review.comment}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {isDesktop ? (
          <WebPortalFooter
            onNavigateTab={handlePortalTab}
            onOpenAuth={openAuthModal}
          />
        ) : null}
      </ScrollView>

      {!isDesktop ? (
        <View className="border-t border-zinc-200 bg-white px-5 py-3.5">
          <Pressable
            className={`items-center rounded-xl py-3.5 ${
              outOfStock ? 'bg-zinc-300' : 'bg-zinc-900'
            }`}
            disabled={outOfStock}
            onPress={handleAddToCart}
          >
            <Text className="text-sm font-bold text-white">
              {outOfStock
                ? 'Stokta yok'
                : `Sepete Ekle (${quantity} ${unitLabel} · ₺${linePreview.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})`}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { StarRating } from '../../components/common/StarRating';
import {
  CartStoreConflictError,
  useCart,
  type CartProductInput,
} from '../../context/CartContext';
import { DELIVERY_OPTION_LABELS } from '../../constants/enums';
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
  openMapsTo,
} from '../../utils/geo';

type Props = NativeStackScreenProps<BuyerHomeStackParamList, 'ProductDetail'>;

export function ProductDetailScreen({ navigation, route }: Props) {
  const { productId } = route.params;
  const { addItem, clearCart, items } = useCart();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingSummary, setRatingSummary] = useState({ average: 0, count: 0 });
  const [storeReviews, setStoreReviews] = useState<ReviewWithBuyer[]>([]);
  const [distanceLabel, setDistanceLabel] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isOpeningMaps, setIsOpeningMaps] = useState(false);

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
      setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, row.stock)));
      const [summary, reviews] = await Promise.all([
        getStoreRatingSummary(row.store_id),
        listStoreReviews(row.store_id),
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
      const message = error instanceof Error ? error.message : 'Ürün yüklenemedi.';
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
  });

  const confirmAdded = (name: string) => {
    Alert.alert('Sepete eklendi', `${name} sepete eklendi.`, [
      { text: 'Alışverişe devam', style: 'cancel' },
      {
        text: 'Sepete git',
        onPress: () => navigation.getParent()?.navigate('Cart'),
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
        Alert.alert('Farklı mağaza', error.message, [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Sepeti temizle ve ekle',
            style: 'destructive',
            onPress: () => {
              try {
                clearCart();
                addItem(toCartInput(product), quantity);
                confirmAdded(product.name);
              } catch (inner) {
                const message =
                  inner instanceof Error ? inner.message : 'Sepete eklenemedi.';
                Alert.alert('Sepet', message);
              }
            },
          },
        ]);
        return;
      }

      const message = error instanceof Error ? error.message : 'Sepete eklenemedi.';
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

  const handleOpenMaps = async () => {
    if (product?.store.latitude == null || product?.store.longitude == null) {
      Alert.alert('Harita', 'Bu mağaza henüz konum kaydetmemiş.');
      return;
    }
    try {
      setIsOpeningMaps(true);
      await openMapsTo(
        {
          latitude: product.store.latitude,
          longitude: product.store.longitude,
        },
        product.store.name
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Harita açılamadı.';
      Alert.alert('Harita', message);
    } finally {
      setIsOpeningMaps(false);
    }
  };

  if (isLoading || !product) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  const outOfStock = product.stock < 1;
  const linePreview = Number(product.price) * quantity;

  return (
    <View className="flex-1 bg-[#FFF8F3]">
      <ScrollView className="flex-1">
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            className="h-72 w-full bg-stone-100"
            resizeMode="cover"
          />
        ) : (
          <View className="h-72 w-full items-center justify-center bg-orange-50">
            <Text className="text-sm font-medium text-brand">Görsel yok</Text>
          </View>
        )}

        <View className="px-5 py-5">
          <Text className="mb-2 text-2xl font-bold text-stone-900">{product.name}</Text>
          <Text className="mb-3 text-2xl font-bold text-brand">
            ₺{Number(product.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </Text>
          <Text className="mb-1 text-sm text-gray-600">
            {product.store.name} · {product.store.city}
            {product.store.district ? ` / ${product.store.district}` : ''}
          </Text>

          {storeHasCoords ? (
            <View className="mb-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <Text className="mb-2 text-sm text-stone-700">
                {distanceLabel
                  ? `Mağazaya uzaklık: ${distanceLabel}`
                  : 'Konum izniyle uzaklığı görebilirsin'}
              </Text>
              <View className="flex-row gap-2">
                {!distanceLabel ? (
                  <Pressable
                    className={`flex-1 items-center rounded-xl border border-brand bg-orange-50 py-2.5 ${
                      isLocating ? 'opacity-70' : ''
                    }`}
                    disabled={isLocating}
                    onPress={() => void handleRefreshDistance()}
                  >
                    {isLocating ? (
                      <ActivityIndicator color="#FF6B00" />
                    ) : (
                      <Text className="text-sm font-semibold text-brand">
                        Uzaklığı hesapla
                      </Text>
                    )}
                  </Pressable>
                ) : null}
                <Pressable
                  className={`flex-1 items-center rounded-xl bg-brand py-2.5 ${
                    isOpeningMaps ? 'opacity-70' : ''
                  }`}
                  disabled={isOpeningMaps}
                  onPress={() => void handleOpenMaps()}
                >
                  {isOpeningMaps ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-sm font-semibold text-white">
                      Haritada aç
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <Text className="mb-3 text-xs text-stone-400">
              Bu mağaza harita konumu eklememiş
            </Text>
          )}

          {ratingSummary.count > 0 ? (
            <View className="mb-2 flex-row items-center">
              <StarRating value={Math.round(ratingSummary.average)} readonly size="sm" />
              <Text className="ml-2 text-sm text-stone-600">
                {ratingSummary.average} · {ratingSummary.count} değerlendirme
              </Text>
            </View>
          ) : (
            <Text className="mb-2 text-sm text-stone-400">Henüz değerlendirme yok</Text>
          )}
          <Text className={`mb-2 text-sm ${outOfStock ? 'text-red-600' : 'text-gray-500'}`}>
            {outOfStock ? 'Stokta yok' : `Stok: ${product.stock} adet`}
          </Text>
          {inCartQty > 0 ? (
            <Text className="mb-4 text-sm font-medium text-brand">
              Sepette şu an {inCartQty} adet var
            </Text>
          ) : (
            <View className="mb-4" />
          )}

          {product.description ? (
            <Text className="mb-4 text-base leading-6 text-gray-700">{product.description}</Text>
          ) : null}

          <Text className="mb-2 text-xs font-semibold uppercase text-gray-500">Teslimat</Text>
          {product.delivery_options.map((option) => (
            <Text key={option} className="mb-1 text-sm text-gray-700">
              • {DELIVERY_OPTION_LABELS[option]}
            </Text>
          ))}

          {!outOfStock ? (
            <View className="mt-6">
              <View className="flex-row items-center">
                <Text className="mr-4 text-sm font-medium text-gray-700">Adet</Text>
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50"
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Text className="text-lg text-gray-800">−</Text>
                </Pressable>
                <Text className="mx-4 min-w-[28px] text-center text-base font-semibold text-gray-900">
                  {quantity}
                </Text>
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50"
                  onPress={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                >
                  <Text className="text-lg text-gray-800">+</Text>
                </Pressable>
              </View>
              <Text className="mt-3 text-sm text-gray-500">
                Ara toplam: ₺
                {linePreview.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          ) : null}

          {storeReviews.length > 0 ? (
            <View className="mt-8">
              <Text className="mb-3 text-xs font-semibold uppercase text-gray-500">
                Mağaza yorumları
              </Text>
              {storeReviews.map((review) => (
                <View
                  key={review.id}
                  className="mb-3 rounded-xl border border-stone-100 bg-stone-50 p-3"
                >
                  <View className="mb-1 flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-stone-800">Alıcı</Text>
                    <StarRating value={review.rating} readonly size="sm" />
                  </View>
                  {review.comment ? (
                    <Text className="text-sm text-stone-600">{review.comment}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View className="border-t border-orange-100 bg-white px-5 py-4">
        <Pressable
          className={`items-center rounded-2xl py-4 ${outOfStock ? 'bg-stone-300' : 'bg-brand'}`}
          disabled={outOfStock}
          onPress={handleAddToCart}
        >
          <Text className="text-base font-bold text-white">
            {outOfStock ? 'Stokta yok' : 'Sepete Ekle'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

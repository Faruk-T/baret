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

import {
  CartStoreConflictError,
  useCart,
  type CartProductInput,
} from '../../context/CartContext';
import { DELIVERY_OPTION_LABELS } from '../../constants/enums';
import { getCatalogProduct, type CatalogProduct } from '../../services/catalog';
import type { BuyerHomeStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<BuyerHomeStackParamList, 'ProductDetail'>;

export function ProductDetailScreen({ navigation, route }: Props) {
  const { productId } = route.params;
  const { addItem, clearCart, items } = useCart();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const row = await getCatalogProduct(productId);
      if (!row) {
        Alert.alert('Bulunamadı', 'Ürün bulunamadı veya satışta değil.');
        navigation.goBack();
        return;
      }
      setProduct(row);
      setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, row.stock)));
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
    const input = toCartInput(product);

    try {
      addItem(input, quantity);
      confirmAdded(product.name);
    } catch (error) {
      if (error instanceof CartStoreConflictError) {
        Alert.alert('Farklı mağaza', error.message, [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Sepeti temizle ve ekle',
            style: 'destructive',
            onPress: () => {
              clearCart();
              try {
                addItem(input, quantity);
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
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            className="h-64 w-full bg-gray-100"
            resizeMode="cover"
          />
        ) : (
          <View className="h-64 w-full items-center justify-center bg-gray-100">
            <Text className="text-sm text-gray-500">Görsel yok</Text>
          </View>
        )}

        <View className="px-6 py-4">
          <Text className="mb-2 text-2xl font-bold text-gray-900">{product.name}</Text>
          <Text className="mb-3 text-xl font-semibold text-brand">
            ₺{Number(product.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </Text>
          <Text className="mb-1 text-sm text-gray-600">
            {product.store.name} · {product.store.city}
            {product.store.district ? ` / ${product.store.district}` : ''}
          </Text>
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
        </View>
      </ScrollView>

      <View className="border-t border-gray-100 px-6 py-4">
        <Pressable
          className={`items-center rounded-xl py-3.5 ${outOfStock ? 'bg-gray-300' : 'bg-brand'}`}
          disabled={outOfStock}
          onPress={handleAddToCart}
        >
          <Text className="text-base font-semibold text-white">
            {outOfStock ? 'Stokta yok' : 'Sepete Ekle'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

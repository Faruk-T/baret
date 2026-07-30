import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ProductThumb } from '../../components/common/ProductThumb';
import { useAuth } from '../../context/AuthContext';
import { DELIVERY_OPTION_LABELS } from '../../constants/enums';
import {
  deleteProduct,
  listStoreProducts,
  reactivateProduct,
} from '../../services/products';
import { getMyStore } from '../../services/stores';
import type { Product } from '../../types/database';
import type { SellerProductsStackParamList } from '../../types/navigation.types';
import { formatTRY } from '../../utils/format';

type Navigation = NativeStackNavigationProp<SellerProductsStackParamList, 'ProductList'>;

export function ProductListScreen() {
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const store = await getMyStore(user.id);
      if (!store) {
        setStoreId(null);
        setProducts([]);
        return;
      }
      setStoreId(store.id);
      const rows = await listStoreProducts(store.id);
      setProducts(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ürünler yüklenemedi.';
      Alert.alert('Hata', message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleDeactivate = (product: Product) => {
    Alert.alert(
      'Ürünü pasife al',
      `"${product.name}" katalogdan kaldırılsın mı? (soft-delete — sipariş geçmişi korunur)`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Pasife al',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteProduct(product.id);
                await load();
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : 'İşlem başarısız.';
                Alert.alert('Hata', message);
              }
            })();
          },
        },
      ]
    );
  };

  const handleReactivate = (product: Product) => {
    void (async () => {
      try {
        await reactivateProduct(product.id);
        await load();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'İşlem başarısız.';
        Alert.alert('Hata', message);
      }
    })();
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50">
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  if (!storeId) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 px-6">
        <Text className="mb-2 text-center text-lg font-semibold text-stone-900">
          Önce mağaza oluştur
        </Text>
        <Text className="text-center text-sm text-stone-500">
          Ürün eklemek için Mağaza sekmesinden mağaza profilini kaydet.
        </Text>
      </View>
    );
  }

  const activeCount = products.filter((p) => p.is_active).length;

  return (
    <View className="flex-1 bg-stone-50">
      <View className="flex-row items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
        <Text className="text-sm text-stone-600">
          {products.length} ürün · {activeCount} aktif
        </Text>
        <Pressable
          className="rounded-xl bg-brand px-4 py-2"
          onPress={() => navigation.navigate('ProductForm', {})}
        >
          <Text className="font-semibold text-white">+ Yeni</Text>
        </Pressable>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 py-3"
        ListEmptyComponent={
          <Text className="mt-10 text-center text-sm text-stone-500">
            Henüz ürün yok. İlk ürününü ekle.
          </Text>
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-2xl border border-stone-200 bg-white p-4">
            <View className="mb-2 flex-row items-start">
              <ProductThumb uri={item.image_url} />
              <View className="flex-1 pr-1">
                <Text className="mb-1 text-base font-semibold text-stone-900">{item.name}</Text>
                <Text className="text-sm text-brand">{formatTRY(item.price)}</Text>
                <Text className="mt-1 text-xs text-stone-500">
                  Stok: {item.stock} · {item.is_active ? 'Aktif' : 'Pasif'}
                </Text>
                <Text className="mt-1 text-xs text-stone-400">
                  {item.delivery_options.map((o) => DELIVERY_OPTION_LABELS[o]).join(' · ')}
                </Text>
              </View>
            </View>
            <View className="mt-2 flex-row gap-2">
              <Pressable
                className="flex-1 items-center rounded-xl border border-stone-200 bg-white py-2"
                onPress={() => navigation.navigate('ProductForm', { productId: item.id })}
              >
                <Text className="font-medium text-stone-800">Düzenle</Text>
              </Pressable>
              {item.is_active ? (
                <Pressable
                  className="flex-1 items-center rounded-xl border border-red-200 bg-red-50 py-2"
                  onPress={() => handleDeactivate(item)}
                >
                  <Text className="font-medium text-red-600">Pasife al</Text>
                </Pressable>
              ) : (
                <Pressable
                  className="flex-1 items-center rounded-xl border border-green-200 bg-green-50 py-2"
                  onPress={() => handleReactivate(item)}
                >
                  <Text className="font-medium text-green-700">Aktifleştir</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

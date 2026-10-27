import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ProductThumb } from '../../components/common/ProductThumb';
import { useAuth } from '../../context/AuthContext';
import { DELIVERY_OPTION_LABELS } from '../../constants/enums';
import { LOW_STOCK_THRESHOLD, isLowStock } from '../../constants/inventory';
import {
  deleteProduct,
  listStoreProducts,
  quickUpdateProductStockPrice,
  reactivateProduct,
} from '../../services/products';
import { getMyStore } from '../../services/stores';
import type { Product } from '../../types/database';
import type { SellerProductsStackParamList } from '../../types/navigation.types';
import { exportCsvFile, toCsv } from '../../utils/csv';
import { formatTRY } from '../../utils/format';
import { normalizeBulkTiers } from '../../utils/pricing';

type Navigation = NativeStackNavigationProp<SellerProductsStackParamList, 'ProductList'>;

export function ProductListScreen() {
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Quick inline edit state
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickPrice, setQuickPrice] = useState('');
  const [quickStock, setQuickStock] = useState('');
  const [savingQuick, setSavingQuick] = useState(false);

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

  const handleSaveQuickEdit = async (productId: string) => {
    const parsedPrice = Number(quickPrice.replace(',', '.'));
    const parsedStock = Number.parseInt(quickStock, 10);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0 || Number.isNaN(parsedStock) || parsedStock < 0) {
      Alert.alert('Geçersiz değer', 'Lütfen geçerli fiyat ve stok girin.');
      return;
    }
    try {
      setSavingQuick(true);
      await quickUpdateProductStockPrice(productId, {
        price: parsedPrice,
        stock: parsedStock,
      });
      setQuickEditId(null);
      await load();
    } catch (error) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Güncellenemedi.');
    } finally {
      setSavingQuick(false);
    }
  };

  const handleExportCsv = async () => {
    const csv = toCsv(
      ['SKU', 'Ürün Adı', 'Kategori', 'Marka', 'Birim', 'Birim Fiyat (TL)', 'Stok', 'Durum'],
      products.map((p) => [
        p.sku ?? '',
        p.name,
        p.category ?? '',
        p.brand ?? '',
        p.unit ?? 'adet',
        p.price,
        p.stock,
        p.is_active ? 'Aktif' : 'Pasif',
      ])
    );
    await exportCsvFile('baret-magaza-envanter.csv', csv, 'Baret Mağaza Envanter Listesi');
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
  const lowStockCount = products.filter((p) => isLowStock(p.stock, p.is_active)).length;

  return (
    <View className="flex-1 bg-stone-50">
      <View className="border-b border-stone-200 bg-white px-4 py-3">
        <View
          style={{ maxWidth: 1080, width: '100%', alignSelf: 'center' }}
          className="flex-row items-center justify-between flex-wrap gap-2"
        >
          <View>
            <Text className="text-sm font-bold text-stone-800">
              {products.length} ürün · {activeCount} aktif
              {lowStockCount > 0 ? ` · ${lowStockCount} düşük stok` : ''}
            </Text>
            {lowStockCount > 0 ? (
              <Text className="mt-0.5 text-xs text-amber-700">
                Stok ≤ {LOW_STOCK_THRESHOLD} olan aktif ürünler turuncu etiketle işaretli.
              </Text>
            ) : null}
          </View>
          <View className="flex-row items-center gap-2">
            {products.length > 0 ? (
              <Pressable
                onPress={() => void handleExportCsv()}
                className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
              >
                <Feather name="download" size={14} color="#44403C" />
                <Text className="ml-1.5 text-xs font-bold text-stone-700">
                  CSV İndir
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              className="rounded-xl bg-brand px-4 py-2"
              onPress={() => navigation.navigate('ProductForm', {})}
            >
              <Text className="font-semibold text-white">+ Yeni Ürün</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 py-3 pb-10"
        ListEmptyComponent={
          <Text className="mt-10 text-center text-sm text-stone-500">
            Henüz ürün yok. İlk ürününü ekle.
          </Text>
        }
        renderItem={({ item }) => {
          const low = isLowStock(item.stock, item.is_active);
          const unitLabel = item.unit ?? 'adet';
          const tiers = normalizeBulkTiers(item.bulk_pricing);
          const isQuickEditing = quickEditId === item.id;

          return (
            <View
              style={{ maxWidth: 1080, width: '100%', alignSelf: 'center' }}
              className={`mb-3 rounded-2xl border bg-white p-4 ${
                low ? 'border-amber-300' : 'border-stone-200'
              }`}
            >
              <View className="mb-2 flex-row items-start">
                <ProductThumb uri={item.image_url} />
                <View className="flex-1 pr-1">
                  <View className="mb-1 flex-row items-center justify-between">
                    <Text className="flex-1 pr-2 text-base font-bold text-stone-900">
                      {item.name}
                    </Text>
                    {low ? (
                      <Text className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        Düşük stok
                      </Text>
                    ) : null}
                  </View>
                  <View className="flex-row items-center flex-wrap gap-2">
                    <Text className="text-sm font-extrabold text-brand">
                      {formatTRY(item.price)} / {unitLabel}
                    </Text>
                    {item.category ? (
                      <Text className="text-xs text-stone-500">· {item.category}</Text>
                    ) : null}
                    {tiers.length > 0 ? (
                      <View className="rounded bg-emerald-100 px-1.5 py-0.5">
                        <Text className="text-[10px] font-bold text-emerald-800">
                          {tiers.length} Toptan Kademe
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    className={`mt-1 text-xs ${
                      low ? 'font-semibold text-amber-700' : 'text-stone-500'
                    }`}
                  >
                    Stok: {item.stock} {unitLabel} · {item.is_active ? 'Aktif' : 'Pasif'}
                  </Text>
                  <Text className="mt-1 text-xs text-stone-400">
                    {item.delivery_options.map((o) => DELIVERY_OPTION_LABELS[o]).join(' · ')}
                  </Text>
                </View>
              </View>

              {isQuickEditing ? (
                <View className="mt-2 mb-2 rounded-xl border border-orange-200 bg-orange-50/50 p-3 flex-row items-end gap-2 flex-wrap">
                  <View className="flex-1 min-w-[110px]">
                    <Text className="text-[11px] font-bold text-stone-600 mb-1">
                      Fiyat (₺ / {unitLabel})
                    </Text>
                    <TextInput
                      value={quickPrice}
                      onChangeText={setQuickPrice}
                      keyboardType="decimal-pad"
                      className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-900"
                    />
                  </View>
                  <View className="flex-1 min-w-[100px]">
                    <Text className="text-[11px] font-bold text-stone-600 mb-1">
                      Stok ({unitLabel})
                    </Text>
                    <TextInput
                      value={quickStock}
                      onChangeText={setQuickStock}
                      keyboardType="number-pad"
                      className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-900"
                    />
                  </View>
                  <Pressable
                    disabled={savingQuick}
                    onPress={() => void handleSaveQuickEdit(item.id)}
                    className="rounded-lg bg-brand px-4 py-2.5"
                  >
                    <Text className="text-xs font-bold text-white">Kaydet</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setQuickEditId(null)}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5"
                  >
                    <Text className="text-xs font-semibold text-stone-600">İptal</Text>
                  </Pressable>
                </View>
              ) : null}

              <View className="mt-2 flex-row gap-2">
                <Pressable
                  className="flex-1 items-center rounded-xl border border-orange-200 bg-orange-50/60 py-2"
                  onPress={() => {
                    setQuickEditId(item.id);
                    setQuickPrice(String(item.price));
                    setQuickStock(String(item.stock));
                  }}
                >
                  <Text className="text-xs font-bold text-brand">Hızlı Stok/Fiyat</Text>
                </Pressable>
                <Pressable
                  className="flex-1 items-center rounded-xl border border-stone-200 bg-white py-2"
                  onPress={() => navigation.navigate('ProductForm', { productId: item.id })}
                >
                  <Text className="text-xs font-semibold text-stone-800">Tam Düzenle</Text>
                </Pressable>
                {item.is_active ? (
                  <Pressable
                    className="flex-1 items-center rounded-xl border border-red-200 bg-red-50 py-2"
                    onPress={() => handleDeactivate(item)}
                  >
                    <Text className="text-xs font-semibold text-red-600">Pasife al</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    className="flex-1 items-center rounded-xl border border-green-200 bg-green-50 py-2"
                    onPress={() => handleReactivate(item)}
                  >
                    <Text className="text-xs font-semibold text-green-700">Aktifleştir</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

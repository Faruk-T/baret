import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PRODUCT_CATEGORIES } from '../../constants/categories';
import { DELIVERY_OPTION_LABELS, DELIVERY_OPTIONS } from '../../constants/enums';
import {
  listCatalogProducts,
  type CatalogProduct,
} from '../../services/catalog';
import type { DeliveryOption } from '../../types/database';

export function HomeScreen() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const searchTerm = selectedCategory
        ? selectedCategory
        : search.trim() || undefined;
      const rows = await listCatalogProducts({
        search: searchTerm,
        city: city.trim() || undefined,
        deliveryOption,
      });
      setProducts(rows);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Ürünler yüklenemedi.';
      setErrorMessage(message);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, city, selectedCategory, deliveryOption]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const toggleCategory = (label: string) => {
    setSelectedCategory((prev) => (prev === label ? null : label));
    setSearch('');
  };

  const toggleDelivery = (option: DeliveryOption) => {
    setDeliveryOption((prev) => (prev === option ? null : option));
  };

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-4 pb-3 pt-2">
        <TextInput
          className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
          placeholder="Ürün ara (örn. çimento)"
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setSelectedCategory(null);
          }}
          returnKeyType="search"
        />

        <TextInput
          className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
          placeholder="Şehir filtrele"
          value={city}
          onChangeText={setCity}
        />

        <Text className="mb-2 text-xs font-semibold uppercase text-gray-500">
          Kategoriler
        </Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[...PRODUCT_CATEGORIES]}
          keyExtractor={(item) => item}
          className="mb-3"
          renderItem={({ item }) => {
            const active = selectedCategory === item;
            return (
              <Pressable
                className={`mr-2 rounded-full border px-3 py-1.5 ${
                  active ? 'border-brand bg-orange-50' : 'border-gray-200 bg-gray-50'
                }`}
                onPress={() => toggleCategory(item)}
              >
                <Text
                  className={`text-sm ${active ? 'font-semibold text-brand' : 'text-gray-700'}`}
                >
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />

        <Text className="mb-2 text-xs font-semibold uppercase text-gray-500">
          Teslimat
        </Text>
        <View className="flex-row flex-wrap">
          {DELIVERY_OPTIONS.map((option) => {
            const active = deliveryOption === option;
            return (
              <Pressable
                key={option}
                className={`mb-2 mr-2 rounded-full border px-3 py-1.5 ${
                  active ? 'border-brand bg-orange-50' : 'border-gray-200 bg-gray-50'
                }`}
                onPress={() => toggleDelivery(option)}
              >
                <Text
                  className={`text-xs ${active ? 'font-semibold text-brand' : 'text-gray-700'}`}
                >
                  {DELIVERY_OPTION_LABELS[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      ) : errorMessage ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-2 text-center text-base font-semibold text-gray-900">
            Yükleme hatası
          </Text>
          <Text className="mb-4 text-center text-sm text-gray-500">{errorMessage}</Text>
          <Pressable className="rounded-xl bg-brand px-5 py-3" onPress={load}>
            <Text className="font-semibold text-white">Tekrar dene</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-3"
          ListEmptyComponent={
            <Text className="mt-10 text-center text-sm text-gray-500">
              Onaylı mağazalarda eşleşen ürün bulunamadı. Filtreleri temizleyip tekrar dene.
            </Text>
          }
          ListHeaderComponent={
            <Text className="mb-3 text-sm text-gray-600">{products.length} ürün</Text>
          }
          renderItem={({ item }) => (
            <View className="mb-3 flex-row rounded-2xl border border-gray-100 bg-gray-50 p-3">
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  className="mr-3 h-20 w-20 rounded-xl bg-gray-200"
                  resizeMode="cover"
                />
              ) : (
                <View className="mr-3 h-20 w-20 items-center justify-center rounded-xl bg-gray-200">
                  <Text className="text-xs text-gray-500">Görsel yok</Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="mb-1 text-base font-semibold text-gray-900" numberOfLines={2}>
                  {item.name}
                </Text>
                <Text className="mb-1 text-sm font-medium text-brand">
                  ₺{Number(item.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </Text>
                <Text className="text-xs text-gray-500" numberOfLines={1}>
                  {item.store.name} · {item.store.city}
                  {item.store.district ? ` / ${item.store.district}` : ''}
                </Text>
                <Text className="mt-1 text-xs text-gray-400">Stok: {item.stock}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

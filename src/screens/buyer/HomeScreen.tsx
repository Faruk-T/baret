import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CatalogProductCard } from '../../components/buyer/CatalogProductCard';
import { PRODUCT_CATEGORIES } from '../../constants/categories';
import { DELIVERY_OPTION_LABELS, DELIVERY_OPTIONS } from '../../constants/enums';
import {
  listCatalogProducts,
  type CatalogProduct,
} from '../../services/catalog';
import type { DeliveryOption } from '../../types/database';
import type { BuyerHomeStackParamList } from '../../types/navigation.types';

type HomeNav = NativeStackNavigationProp<BuyerHomeStackParamList, 'HomeList'>;

function parseOptionalPrice(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        search.trim() ||
          city.trim() ||
          district.trim() ||
          minPrice.trim() ||
          maxPrice.trim() ||
          selectedCategory ||
          deliveryOption
      ),
    [search, city, district, minPrice, maxPrice, selectedCategory, deliveryOption]
  );

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      try {
        if (mode === 'refresh') setIsRefreshing(true);
        else setIsLoading(true);
        setErrorMessage(null);

        const searchTerm = selectedCategory
          ? selectedCategory
          : search.trim() || undefined;

        const rows = await listCatalogProducts({
          search: searchTerm,
          city: city.trim() || undefined,
          district: district.trim() || undefined,
          deliveryOption,
          minPrice: parseOptionalPrice(minPrice),
          maxPrice: parseOptionalPrice(maxPrice),
        });
        setProducts(rows);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Ürünler yüklenemedi.';
        setErrorMessage(message);
        setProducts([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [search, city, district, minPrice, maxPrice, selectedCategory, deliveryOption]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void load('initial');
    }, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const clearFilters = () => {
    setSearch('');
    setCity('');
    setDistrict('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedCategory(null);
    setDeliveryOption(null);
  };

  const toggleCategory = (label: string) => {
    setSelectedCategory((prev) => (prev === label ? null : label));
    setSearch('');
  };

  const toggleDelivery = (option: DeliveryOption) => {
    setDeliveryOption((prev) => (prev === option ? null : option));
  };

  return (
    <View className="flex-1 bg-stone-50">
      <View className="border-b border-orange-100 bg-[#fffaf7] px-4 pb-3 pt-2">
        <Text className="mb-0.5 text-2xl font-bold text-stone-900">Baret</Text>
        <Text className="mb-3 text-sm text-stone-500">
          Şantiye malzemesi · onaylı nalburlar
        </Text>
        <TextInput
          className="mb-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900"
          placeholder="Ürün ara (örn. çimento)"
          placeholderTextColor="#a8a29e"
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setSelectedCategory(null);
          }}
          returnKeyType="search"
        />

        <View className="mb-2 flex-row gap-2">
          <TextInput
            className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900"
            placeholder="Şehir"
            placeholderTextColor="#a8a29e"
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900"
            placeholder="İlçe"
            placeholderTextColor="#a8a29e"
            value={district}
            onChangeText={setDistrict}
          />
        </View>

        <View className="mb-2 flex-row gap-2">
          <TextInput
            className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900"
            placeholder="Min ₺"
            placeholderTextColor="#a8a29e"
            value={minPrice}
            onChangeText={setMinPrice}
            keyboardType="decimal-pad"
          />
          <TextInput
            className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900"
            placeholder="Max ₺"
            placeholderTextColor="#a8a29e"
            value={maxPrice}
            onChangeText={setMaxPrice}
            keyboardType="decimal-pad"
          />
        </View>

        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Kategoriler
        </Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[...PRODUCT_CATEGORIES]}
          keyExtractor={(item) => item}
          className="mb-2"
          renderItem={({ item }) => {
            const active = selectedCategory === item;
            return (
              <Pressable
                className={`mr-2 rounded-full border px-3 py-1.5 ${
                  active
                    ? 'border-brand bg-brand'
                    : 'border-stone-200 bg-white'
                }`}
                onPress={() => toggleCategory(item)}
              >
                <Text
                  className={`text-sm ${
                    active ? 'font-semibold text-white' : 'text-stone-700'
                  }`}
                >
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />

        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Teslimat
        </Text>
        <View className="mb-2 flex-row flex-wrap">
          {DELIVERY_OPTIONS.map((option) => {
            const active = deliveryOption === option;
            return (
              <Pressable
                key={option}
                className={`mb-2 mr-2 rounded-full border px-3 py-1.5 ${
                  active
                    ? 'border-brand bg-brand'
                    : 'border-stone-200 bg-white'
                }`}
                onPress={() => toggleDelivery(option)}
              >
                <Text
                  className={`text-xs ${
                    active ? 'font-semibold text-white' : 'text-stone-700'
                  }`}
                >
                  {DELIVERY_OPTION_LABELS[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {hasActiveFilters ? (
          <Pressable onPress={clearFilters} className="self-start py-1">
            <Text className="text-sm font-medium text-brand">Filtreleri temizle</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading && !isRefreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      ) : errorMessage ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-2 text-center text-base font-semibold text-gray-900">
            Yükleme hatası
          </Text>
          <Text className="mb-4 text-center text-sm text-gray-500">{errorMessage}</Text>
          <Pressable className="rounded-xl bg-brand px-5 py-3" onPress={() => load('initial')}>
            <Text className="font-semibold text-white">Tekrar dene</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-3"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => load('refresh')}
              tintColor="#FF6B00"
              colors={['#FF6B00']}
            />
          }
          ListEmptyComponent={
            <View className="mt-10 px-4">
              <Text className="mb-2 text-center text-base font-semibold text-stone-900">
                Ürün bulunamadı
              </Text>
              <Text className="text-center text-sm text-stone-500">
                Onaylı mağazalarda eşleşen ürün yok. Filtreleri temizleyip tekrar dene.
              </Text>
              {hasActiveFilters ? (
                <Pressable className="mt-4 items-center" onPress={clearFilters}>
                  <Text className="font-medium text-brand">Filtreleri temizle</Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListHeaderComponent={
            <Text className="mb-3 text-sm font-medium text-stone-600">
              {products.length} ürün
            </Text>
          }
          renderItem={({ item }) => (
            <CatalogProductCard
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
            />
          )}
        />
      )}
    </View>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { B2BQuickOrderTable } from '../../components/buyer/B2BQuickOrderTable';
import { CatalogProductCard } from '../../components/buyer/CatalogProductCard';
import { WebPortalFooter } from '../../components/layout/WebPortalFooter';
import {
  WebPortalHeader,
  type WebPortalActiveTab,
} from '../../components/layout/WebPortalHeader';
import { PRODUCT_CATEGORIES } from '../../constants/categories';
import { DELIVERY_OPTION_LABELS, DELIVERY_OPTIONS } from '../../constants/enums';
import { useAuth } from '../../context/AuthContext';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import {
  listCatalogProducts,
  type CatalogProduct,
} from '../../services/catalog';
import type { DeliveryOption } from '../../types/database';
import type { BuyerHomeStackParamList } from '../../types/navigation.types';
import { usePageSeo } from '../../utils/seo';

type HomeNav = NativeStackNavigationProp<BuyerHomeStackParamList, 'HomeList'>;
type SortOption = 'recommended' | 'price_asc' | 'price_desc';

const QUICK_CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Gaziantep'] as const;

function parseOptionalPrice(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const { session } = useAuth();
  const { isDesktop, isWeb, gridColumns } = useResponsiveLayout();

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption | null>(
    null
  );
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'quick_order'>('grid');
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
          deliveryOption ||
          inStockOnly
      ),
    [
      search,
      city,
      district,
      minPrice,
      maxPrice,
      selectedCategory,
      deliveryOption,
      inStockOnly,
    ]
  );

  const sortedProducts = useMemo(() => {
    const copy = [...products];
    if (sortBy === 'price_asc') {
      copy.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price_desc') {
      copy.sort((a, b) => Number(b.price) - Number(a.price));
    }
    return copy;
  }, [products, sortBy]);

  // Dynamic SEO & Schema.org JSON-LD for Web
  const seoJsonLd = useMemo(
    () => [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Baret Yapı & Şantiye Tedarik Platformu',
        url: 'https://baret.app',
        inLanguage: 'tr-TR',
        description:
          'İnşaat malzemeleri, çimento, demir, alçıpan, boya ve hırdavat ürünlerinde onaylı yapı marketlerden toptan kademeli fiyat ve şantiye sevkiyatı.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: selectedCategory || 'Yapı ve Şantiye Malzemeleri Kataloğu',
        numberOfItems: sortedProducts.length,
        itemListElement: sortedProducts.slice(0, 10).map((p, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          item: {
            '@type': 'Product',
            name: p.name,
            sku: p.sku || p.id,
            brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
            description: p.description || p.name,
            image: p.image_url || undefined,
            offers: {
              '@type': 'Offer',
              priceCurrency: 'TRY',
              price: Number(p.price),
              availability:
                p.stock > 0
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
              seller: {
                '@type': 'Organization',
                name: p.store.name,
              },
            },
          },
        })),
      },
    ],
    [selectedCategory, sortedProducts]
  );

  usePageSeo({
    title: selectedCategory
      ? `${selectedCategory} Fiyatları & Toptan Şantiye Tedariği | Baret`
      : 'Baret — Yapı, İnşaat & Şantiye Malzemeleri Tedarik Platformu',
    description: selectedCategory
      ? `${selectedCategory} kategorisinde onaylı yapı market ve nalburlardan kademeli toptan fiyatlarla şantiyenize doğrudan sevkiyat.`
      : 'Çimento, inşaat demiri, alçıpan, dış cephe boyası, yalıtım ve el aletlerinde onaylı tedarikçilerden toptan kademeli fiyatlarla güvenli alışveriş.',
    canonicalPath: '/',
    jsonLd: seoJsonLd,
  });

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (search.trim()) parts.push(`“${search.trim()}”`);
    if (selectedCategory) parts.push(selectedCategory);
    if (inStockOnly) parts.push('Sadece Stokta');
    if (city.trim()) parts.push(city.trim());
    if (district.trim()) parts.push(district.trim());
    if (minPrice.trim() || maxPrice.trim()) {
      parts.push(`${minPrice.trim() || '0'}–${maxPrice.trim() || '∞'} ₺`);
    }
    if (deliveryOption) parts.push(DELIVERY_OPTION_LABELS[deliveryOption]);
    return parts.join(' · ');
  }, [
    search,
    selectedCategory,
    inStockOnly,
    city,
    district,
    minPrice,
    maxPrice,
    deliveryOption,
  ]);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      try {
        if (mode === 'refresh') setIsRefreshing(true);
        else setIsLoading(true);
        setErrorMessage(null);

        const rows = await listCatalogProducts({
          search: search.trim() || undefined,
          category: selectedCategory || undefined,
          city: city.trim() || undefined,
          district: district.trim() || undefined,
          deliveryOption,
          minPrice: parseOptionalPrice(minPrice),
          maxPrice: parseOptionalPrice(maxPrice),
          inStockOnly,
        });
        setProducts(rows);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof (error as { message: unknown }).message === 'string'
              ? (error as { message: string }).message
              : 'Ürünler yüklenemedi.';
        setErrorMessage(message);
        setProducts([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      search,
      city,
      district,
      minPrice,
      maxPrice,
      selectedCategory,
      deliveryOption,
      inStockOnly,
    ]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void load('initial');
    }, 220);
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
    setInStockOnly(false);
  };

  const toggleCategory = (label: string) => {
    setSelectedCategory((prev) => (prev === label ? null : label));
  };

  const toggleDelivery = (option: DeliveryOption) => {
    setDeliveryOption((prev) => (prev === option ? null : option));
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    const rootNav = navigation.getParent()?.getParent() as any;
    if (rootNav) {
      rootNav.navigate('Auth', {
        screen: mode === 'register' ? 'RoleSelect' : 'Login',
      });
    }
  };

  const handlePortalTab = (tab: WebPortalActiveTab) => {
    const tabNav = navigation.getParent() as any;
    if (tab === 'catalog') {
      setViewMode('grid');
    } else if (tab === 'quick_order') {
      setViewMode('quick_order');
    } else if (tab === 'rfq') {
      tabNav?.navigate('Rfq');
    } else if (tab === 'orders') {
      tabNav?.navigate('Orders');
    } else if (tab === 'profile') {
      tabNav?.navigate('Profile');
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerShown: !isWeb && !isDesktop,
    });
  }, [navigation, isWeb, isDesktop]);

  // Clean Desktop Left Filter Panel (268px, zero overflow)
  const renderDesktopSidebarFilters = () => (
    <View style={{ width: 268 }} className="self-start">
      <View className="rounded-xl border border-zinc-200 bg-white p-4">
        <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-zinc-100">
          <View className="flex-row items-center">
            <Feather name="sliders" size={14} color="#18181B" />
            <Text className="text-xs font-bold uppercase tracking-wider text-zinc-900 ml-2">
              Filtreler
            </Text>
          </View>
          {hasActiveFilters ? (
            <Pressable onPress={clearFilters}>
              <Text className="text-xs font-semibold text-amber-700">
                Sıfırla
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Quick City Chips */}
        <Text className="text-[11px] font-semibold text-zinc-700 mb-1.5">
          Bölge / Şehir
        </Text>
        <View className="flex-row flex-wrap gap-1.5 mb-2">
          {QUICK_CITIES.map((c) => {
            const active = city.trim().toLocaleLowerCase('tr-TR') === c.toLocaleLowerCase('tr-TR');
            return (
              <Pressable
                key={c}
                onPress={() => setCity(active ? '' : c)}
                className={`px-2.5 py-1 rounded-md border ${
                  active
                    ? 'bg-zinc-900 border-zinc-900'
                    : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <Text
                  className={`text-[11px] font-medium ${
                    active ? 'text-white' : 'text-zinc-700'
                  }`}
                >
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="Şehir ara (örn. Bursa)"
          placeholderTextColor="#A1A1AA"
          style={{ minWidth: 0 }}
          className="mb-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900"
        />

        <Text className="text-[11px] font-semibold text-zinc-700 mb-1.5">
          İlçe
        </Text>
        <TextInput
          value={district}
          onChangeText={setDistrict}
          placeholder="Örn: Tuzla, Ostim, Şehitkamil"
          placeholderTextColor="#A1A1AA"
          style={{ minWidth: 0 }}
          className="mb-3.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900"
        />

        {/* Unit Price Range (Fixed minWidth: 0 so inputs never overflow!) */}
        <Text className="text-[11px] font-semibold text-zinc-700 mb-1.5">
          Birim Fiyat Aralığı (₺)
        </Text>
        <View className="flex-row items-center gap-2 mb-3.5">
          <View className="flex-1" style={{ minWidth: 0 }}>
            <TextInput
              value={minPrice}
              onChangeText={setMinPrice}
              placeholder="En az ₺"
              placeholderTextColor="#A1A1AA"
              keyboardType="decimal-pad"
              style={{ minWidth: 0, width: '100%' }}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-900"
            />
          </View>
          <Text className="text-xs text-zinc-400">–</Text>
          <View className="flex-1" style={{ minWidth: 0 }}>
            <TextInput
              value={maxPrice}
              onChangeText={setMaxPrice}
              placeholder="En çok ₺"
              placeholderTextColor="#A1A1AA"
              keyboardType="decimal-pad"
              style={{ minWidth: 0, width: '100%' }}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-900"
            />
          </View>
        </View>

        {/* Stock Filter */}
        <Pressable
          onPress={() => setInStockOnly(!inStockOnly)}
          className={`mb-3.5 flex-row items-center justify-between rounded-lg border px-3 py-2.5 ${
            inStockOnly
              ? 'border-zinc-900 bg-zinc-900/5'
              : 'border-zinc-200 bg-zinc-50'
          }`}
        >
          <Text className="text-xs font-semibold text-zinc-800">
            Sadece Stokta Olanlar
          </Text>
          <Ionicons
            name={inStockOnly ? 'checkbox' : 'square-outline'}
            size={17}
            color={inStockOnly ? '#18181B' : '#A1A1AA'}
          />
        </Pressable>

        {/* Delivery Options */}
        <Text className="text-[11px] font-semibold text-zinc-700 mb-1.5">
          Sevkiyat & Teslimat
        </Text>
        <View className="gap-1.5">
          {DELIVERY_OPTIONS.map((option) => {
            const active = deliveryOption === option;
            return (
              <Pressable
                key={option}
                onPress={() => toggleDelivery(option)}
                className={`flex-row items-center justify-between rounded-lg border px-3 py-2 ${
                  active
                    ? 'border-zinc-900 bg-zinc-900'
                    : 'border-zinc-200 bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    active ? 'text-white' : 'text-zinc-700'
                  }`}
                >
                  {DELIVERY_OPTION_LABELS[option]}
                </Text>
                {active ? (
                  <Feather name="check" size={13} color="#FFFFFF" />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Subtle B2B RFQ Callout Box below sidebar */}
      <View className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
        <View className="flex-row items-center mb-1.5">
          <View className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 items-center justify-center mr-2.5">
            <Feather name="file-text" size={14} color="#B45309" />
          </View>
          <Text className="text-xs font-bold text-zinc-900 flex-1">
            Şantiye İhalesi (RFQ)
          </Text>
        </View>
        <Text className="text-[11px] text-zinc-500 leading-4 mb-3">
          Çok kalemli malzeme listenizi yükleyin, bölgenizdeki onaylı
          tedarikçilerden toplu fiyat teklifi alın.
        </Text>
        <Pressable
          onPress={() => (navigation.getParent() as any)?.navigate('Rfq')}
          className="rounded-lg bg-zinc-900 py-2 px-3 items-center flex-row justify-center"
        >
          <Text className="text-xs font-semibold text-white">
            Teklif Talebi Oluştur
          </Text>
          <Feather
            name="arrow-right"
            size={13}
            color="#FFFFFF"
            style={{ marginLeft: 6 }}
          />
        </Pressable>
      </View>
    </View>
  );

  // Desktop Web Layout (>= 1024px)
  if (isDesktop) {
    return (
      <View className="flex-1 bg-[#FAFAFA]">
        <WebPortalHeader
          activeTab={viewMode === 'quick_order' ? 'quick_order' : 'catalog'}
          onSelectTab={handlePortalTab}
          searchValue={search}
          onChangeSearch={(t) => {
            setSearch(t);
          }}
          onOpenCart={() => (navigation.getParent() as any)?.navigate('Cart')}
          onOpenAuth={openAuthModal}
          cityLabel={city}
        />

        {/* Horizontal Category Bar */}
        <View className="bg-white border-b border-zinc-200 px-6 py-2.5">
          <View
            style={{ maxWidth: 1380, width: '100%', alignSelf: 'center' }}
            className="flex-row items-center flex-wrap gap-1.5"
          >
            <Pressable
              onPress={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-lg border ${
                selectedCategory === null
                  ? 'bg-zinc-900 border-zinc-900'
                  : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selectedCategory === null ? 'text-white' : 'text-zinc-700'
                }`}
              >
                Tüm Malzemeler
              </Text>
            </Pressable>

            {PRODUCT_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg border ${
                    active
                      ? 'bg-zinc-900 border-zinc-900'
                      : 'bg-white border-zinc-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      active ? 'text-white font-semibold' : 'text-zinc-700'
                    }`}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView className="flex-1">
          <View
            style={{ maxWidth: 1380, width: '100%', alignSelf: 'center' }}
            className="px-6 pt-6"
          >
            <View className="flex-row items-start gap-6">
              {/* Left Filter Sidebar */}
              {renderDesktopSidebarFilters()}

              {/* Right Catalog Workspace */}
              <View className="flex-1" style={{ minWidth: 0 }}>
                {/* Catalog Toolbar */}
                <View className="rounded-xl border border-zinc-200 bg-white px-4 py-3 mb-4 flex-row items-center justify-between flex-wrap gap-3">
                  <View>
                    <Text className="text-base font-bold text-zinc-900">
                      {selectedCategory || 'Yapı & Şantiye Malzemeleri Kataloğu'}
                    </Text>
                    <Text className="text-xs text-zinc-500 mt-0.5">
                      Onaylı tedarikçi mağazalarında{' '}
                      <Text className="font-semibold text-zinc-800">
                        {sortedProducts.length} ürün
                      </Text>{' '}
                      listeleniyor
                      {hasActiveFilters ? ` • ${activeFilterSummary}` : ''}
                    </Text>
                  </View>

                  {/* Sort + View Switcher */}
                  <View className="flex-row items-center gap-2.5 flex-wrap">
                    <View className="flex-row items-center bg-zinc-100 rounded-lg p-0.5 border border-zinc-200">
                      {(
                        [
                          { key: 'recommended', label: 'Önerilen' },
                          { key: 'price_asc', label: 'Fiyat: Artan' },
                          { key: 'price_desc', label: 'Fiyat: Azalan' },
                        ] as const
                      ).map((opt) => {
                        const active = sortBy === opt.key;
                        return (
                          <Pressable
                            key={opt.key}
                            onPress={() => setSortBy(opt.key)}
                            className={`px-2.5 py-1.5 rounded-md ${
                              active ? 'bg-white' : 'bg-transparent'
                            }`}
                          >
                            <Text
                              className={`text-[11px] font-semibold ${
                                active ? 'text-zinc-900' : 'text-zinc-500'
                              }`}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <View className="flex-row items-center bg-zinc-100 border border-zinc-200 rounded-lg p-0.5">
                      <Pressable
                        onPress={() => setViewMode('grid')}
                        className={`flex-row items-center px-2.5 py-1.5 rounded-md ${
                          viewMode === 'grid' ? 'bg-zinc-900' : 'bg-transparent'
                        }`}
                      >
                        <Feather
                          name="grid"
                          size={13}
                          color={viewMode === 'grid' ? '#FFFFFF' : '#52525B'}
                        />
                        <Text
                          className={`text-[11px] font-semibold ml-1.5 ${
                            viewMode === 'grid' ? 'text-white' : 'text-zinc-600'
                          }`}
                        >
                          Kartlar
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setViewMode('quick_order')}
                        className={`flex-row items-center px-2.5 py-1.5 rounded-md ${
                          viewMode === 'quick_order'
                            ? 'bg-zinc-900'
                            : 'bg-transparent'
                        }`}
                      >
                        <Feather
                          name="list"
                          size={13}
                          color={
                            viewMode === 'quick_order' ? '#FFFFFF' : '#52525B'
                          }
                        />
                        <Text
                          className={`text-[11px] font-semibold ml-1.5 ${
                            viewMode === 'quick_order'
                              ? 'text-white'
                              : 'text-zinc-600'
                          }`}
                        >
                          Toplu Tablo
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Main Content */}
                {isLoading ? (
                  <View className="py-24 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                    <ActivityIndicator size="large" color="#18181B" />
                    <Text className="text-xs text-zinc-500 mt-3">
                      Katalog yükleniyor...
                    </Text>
                  </View>
                ) : errorMessage ? (
                  <View className="rounded-xl border border-zinc-200 bg-white p-10 items-center">
                    <Feather name="alert-circle" size={32} color="#71717A" />
                    <Text className="text-base font-bold text-zinc-900 mt-3 mb-1">
                      Katalog verisi alınamadı
                    </Text>
                    <Text className="text-xs text-zinc-500 mb-4 text-center max-w-[420px]">
                      {errorMessage}
                    </Text>
                    <Pressable
                      className="rounded-lg bg-zinc-900 px-5 py-2.5"
                      onPress={() => void load('initial')}
                    >
                      <Text className="font-semibold text-white text-xs">
                        Tekrar Dene
                      </Text>
                    </Pressable>
                  </View>
                ) : sortedProducts.length === 0 ? (
                  <View className="rounded-xl border border-zinc-200 bg-white p-12 items-center">
                    <Feather name="package" size={36} color="#A1A1AA" />
                    <Text className="mt-3 text-base font-bold text-zinc-900">
                      Aramanızla eşleşen malzeme bulunamadı
                    </Text>
                    <Text className="mt-1 text-xs text-zinc-500 text-center max-w-[380px]">
                      Filtre kriterlerinizi genişletebilir veya aradığınız
                      malzemeler için doğrudan tedarikçilerden teklif
                      isteyebilirsiniz.
                    </Text>
                    <View className="flex-row items-center gap-3 mt-4">
                      {hasActiveFilters ? (
                        <Pressable
                          onPress={clearFilters}
                          className="rounded-lg border border-zinc-300 bg-white px-4 py-2"
                        >
                          <Text className="text-xs font-semibold text-zinc-800">
                            Filtreleri Temizle
                          </Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        onPress={() =>
                          (navigation.getParent() as any)?.navigate('Rfq')
                        }
                        className="rounded-lg bg-zinc-900 px-4 py-2"
                      >
                        <Text className="text-xs font-semibold text-white">
                          Özel Teklif İste (RFQ)
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : viewMode === 'quick_order' ? (
                  <B2BQuickOrderTable
                    products={sortedProducts}
                    onPressProduct={(productId) =>
                      navigation.navigate('ProductDetail', { productId })
                    }
                  />
                ) : (
                  <View className="flex-row flex-wrap -mx-2">
                    {sortedProducts.map((item) => (
                      <View
                        key={item.id}
                        style={{ width: `${100 / gridColumns}%` as any }}
                        className="p-2"
                      >
                        <CatalogProductCard
                          product={item}
                          gridMode
                          onPress={() =>
                            navigation.navigate('ProductDetail', {
                              productId: item.id,
                            })
                          }
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          <WebPortalFooter
            onSelectCategory={(cat) => setSelectedCategory(cat)}
            onNavigateTab={handlePortalTab}
            onOpenAuth={openAuthModal}
          />
        </ScrollView>
      </View>
    );
  }

  // Mobile & Tablet Layout
  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="border-b border-zinc-200 bg-white px-4 pb-3 pt-2">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-lg bg-zinc-900 items-center justify-center mr-2.5">
              <View className="w-3.5 h-3.5 rounded-sm bg-amber-500" />
            </View>
            <View>
              <Text className="text-lg font-extrabold text-zinc-900">
                BARET
              </Text>
              <Text className="text-[11px] text-zinc-500">
                Yapı & Şantiye Tedarik Platformu
              </Text>
            </View>
          </View>
          {!session ? (
            <Pressable
              onPress={() => openAuthModal('login')}
              className="flex-row items-center rounded-lg bg-zinc-900 px-3 py-2"
            >
              <Ionicons name="log-in-outline" size={15} color="#FFFFFF" />
              <Text className="text-xs font-semibold text-white ml-1">
                Giriş / Üye Ol
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row gap-2 mb-2">
          <Pressable
            onPress={() => setFiltersOpen((open) => !open)}
            className="flex-1 flex-row items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
          >
            <View className="mr-2 flex-1">
              <Text className="text-xs font-bold text-zinc-900">
                {filtersOpen ? 'Filtreleri gizle' : 'Malzeme ara ve filtrele'}
              </Text>
              {!filtersOpen && hasActiveFilters ? (
                <Text
                  className="mt-0.5 text-[11px] text-zinc-500"
                  numberOfLines={1}
                >
                  {activeFilterSummary}
                </Text>
              ) : !filtersOpen ? (
                <Text className="mt-0.5 text-[11px] text-zinc-400">
                  Şehir, kategori, toptan fiyat
                </Text>
              ) : null}
            </View>
            <Ionicons
              name={filtersOpen ? 'chevron-up' : 'chevron-down'}
              size={17}
              color="#18181B"
            />
          </Pressable>

          <Pressable
            onPress={() =>
              setViewMode((m) => (m === 'grid' ? 'quick_order' : 'grid'))
            }
            className={`px-3 py-2 rounded-lg border items-center justify-center ${
              viewMode === 'quick_order'
                ? 'bg-zinc-900 border-zinc-900'
                : 'bg-white border-zinc-200'
            }`}
          >
            <Feather
              name={viewMode === 'quick_order' ? 'grid' : 'list'}
              size={15}
              color={viewMode === 'quick_order' ? '#FFFFFF' : '#18181B'}
            />
            <Text
              className={`text-[10px] font-semibold mt-0.5 ${
                viewMode === 'quick_order' ? 'text-white' : 'text-zinc-700'
              }`}
            >
              {viewMode === 'quick_order' ? 'Kartlar' : 'Tablo'}
            </Text>
          </Pressable>
        </View>

        {filtersOpen ? (
          <View className="pt-1">
            <TextInput
              className="mb-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900"
              placeholder="Ürün ara (örn. çimento, demir, boya)"
              placeholderTextColor="#A1A1AA"
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                setSelectedCategory(null);
              }}
              returnKeyType="search"
            />

            <View className="mb-2 flex-row gap-2">
              <TextInput
                style={{ minWidth: 0 }}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900"
                placeholder="Şehir"
                placeholderTextColor="#A1A1AA"
                value={city}
                onChangeText={setCity}
              />
              <TextInput
                style={{ minWidth: 0 }}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900"
                placeholder="İlçe"
                placeholderTextColor="#A1A1AA"
                value={district}
                onChangeText={setDistrict}
              />
            </View>

            <View className="mb-2 flex-row gap-2">
              <TextInput
                style={{ minWidth: 0 }}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900"
                placeholder="Min ₺"
                placeholderTextColor="#A1A1AA"
                value={minPrice}
                onChangeText={setMinPrice}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={{ minWidth: 0 }}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900"
                placeholder="Max ₺"
                placeholderTextColor="#A1A1AA"
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="decimal-pad"
              />
            </View>

            <Text className="mb-1.5 text-xs font-semibold text-zinc-600">
              Kategoriler
            </Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[...PRODUCT_CATEGORIES]}
              keyExtractor={(item) => item}
              className="mb-2"
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = selectedCategory === item;
                return (
                  <Pressable
                    className={`mr-2 rounded-lg border px-3 py-1.5 ${
                      active
                        ? 'border-zinc-900 bg-zinc-900'
                        : 'border-zinc-200 bg-white'
                    }`}
                    onPress={() => toggleCategory(item)}
                  >
                    <Text
                      className={`text-xs ${
                        active ? 'font-semibold text-white' : 'text-zinc-700'
                      }`}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              }}
            />

            <View className="flex-row items-center justify-between gap-3 mt-1">
              {hasActiveFilters ? (
                <Pressable onPress={clearFilters} className="py-2">
                  <Text className="text-xs font-semibold text-amber-700">
                    Filtreleri temizle
                  </Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable
                onPress={() => setFiltersOpen(false)}
                className="rounded-lg bg-zinc-900 px-4 py-2"
              >
                <Text className="text-xs font-semibold text-white">
                  Uygula ve kapat
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {isLoading && !isRefreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#18181B" />
        </View>
      ) : errorMessage ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-2 text-center text-base font-semibold text-zinc-900">
            Katalog yüklenemedi
          </Text>
          <Text className="mb-4 text-center text-sm text-zinc-500">
            {errorMessage}
          </Text>
          <Pressable
            className="rounded-lg bg-zinc-900 px-5 py-2.5"
            onPress={() => load('initial')}
          >
            <Text className="font-semibold text-white text-xs">
              Tekrar dene
            </Text>
          </Pressable>
        </View>
      ) : viewMode === 'quick_order' ? (
        <ScrollView className="flex-1 p-3">
          <B2BQuickOrderTable
            products={sortedProducts}
            onPressProduct={(productId) =>
              navigation.navigate('ProductDetail', { productId })
            }
          />
        </ScrollView>
      ) : (
        <FlatList
          data={sortedProducts}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-3"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => load('refresh')}
              tintColor="#18181B"
              colors={['#18181B']}
            />
          }
          ListHeaderComponent={
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-zinc-600">
                {sortedProducts.length} aktif ürün
              </Text>
              <Pressable
                onPress={() => (navigation.getParent() as any)?.navigate('Rfq')}
                className="flex-row items-center rounded-lg bg-zinc-900 px-2.5 py-1.5"
              >
                <Ionicons
                  name="document-text-outline"
                  size={13}
                  color="#FFFFFF"
                />
                <Text className="ml-1 text-xs font-semibold text-white">
                  Toplu Teklif İste (RFQ)
                </Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <CatalogProductCard
              product={item}
              onPress={() =>
                navigation.navigate('ProductDetail', { productId: item.id })
              }
            />
          )}
        />
      )}
    </View>
  );
}

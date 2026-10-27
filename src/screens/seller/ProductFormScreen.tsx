import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../context/AuthContext';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  PRODUCT_UNIT_LABELS,
} from '../../constants/categories';
import { DELIVERY_OPTION_LABELS, DELIVERY_OPTIONS } from '../../constants/enums';
import { createProduct, getProduct, updateProduct } from '../../services/products';
import { getMyStore } from '../../services/stores';
import { uploadProductImage } from '../../services/storage';
import type { BulkPriceTier, DeliveryOption } from '../../types/database';
import type { SellerProductsStackParamList } from '../../types/navigation.types';
import { isLicenseValid } from '../../utils/license';
import { getStorePlanUsage, type EffectivePlan } from '../../services/plans';
import { normalizeBulkTiers } from '../../utils/pricing';
import { ui } from '../../theme/ui';

type Props = NativeStackScreenProps<SellerProductsStackParamList, 'ProductForm'>;

export function ProductFormScreen({ navigation, route }: Props) {
  const productId = route.params?.productId;
  const isEdit = Boolean(productId);
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [category, setCategory] = useState<string>(PRODUCT_CATEGORIES[0]);
  const [unit, setUnit] = useState<string>('adet');
  const [minOrderQty, setMinOrderQty] = useState('1');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [bulkTiers, setBulkTiers] = useState<
    Array<{ min_qty: string; unit_price: string }>
  >([]);

  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>(['gel_al']);
  const [isActive, setIsActive] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [localImageMime, setLocalImageMime] = useState<string | null>(null);
  const [planUsage, setPlanUsage] = useState<EffectivePlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        const store = await getMyStore(user.id);
        if (!store) {
          Alert.alert('Mağaza yok', 'Önce Mağaza sekmesinden mağaza oluştur.');
          navigation.goBack();
          return;
        }
        if (!productId && !isLicenseValid(store.license_expires_at)) {
          Alert.alert(
            'Yetki / Lisans Gerekli',
            Platform.OS === 'ios'
              ? 'Yeni ürün eklemek için kurumsal satıcı hesabınızın yönetici tarafından yetkilendirilmiş olması gerekir.'
              : 'Yeni ürün eklemek için geçerli bir satıcı lisansı gerekir. Mağaza sekmesinden anahtar aktive et.',
            [{ text: 'Tamam', onPress: () => navigation.goBack() }]
          );
          return;
        }

        const planInfo = await getStorePlanUsage(store.id).catch(() => null);
        if (!mounted) return;
        setPlanUsage(planInfo);

        if (!productId && planInfo) {
          if (!planInfo.isActive) {
            Alert.alert(
              'Kapasite Tanımı Gerekli',
              'Yeni ürün eklemek için aktif bir satıcı paketinizin tanımlanmış olması gerekir. Lütfen yönetici ile iletişime geçin.',
              [{ text: 'Tamam', onPress: () => navigation.goBack() }]
            );
            return;
          }
          if (planInfo.remainingSlots <= 0) {
            Alert.alert(
              'Ürün Kotası Doldu',
              `Mevcut paketinizin ürün kapasitesine (${planInfo.maxProducts} ürün) ulaştınız.`,
              [{ text: 'Tamam', onPress: () => navigation.goBack() }]
            );
            return;
          }
        }

        setStoreId(store.id);

        if (productId) {
          const product = await getProduct(productId);
          if (!product) {
            Alert.alert('Bulunamadı', 'Ürün bulunamadı.');
            navigation.goBack();
            return;
          }
          if (!mounted) return;
          setName(product.name);
          setDescription(product.description ?? '');
          setPrice(String(product.price));
          setStock(String(product.stock));
          setCategory(product.category || PRODUCT_CATEGORIES[0]);
          setUnit(product.unit || 'adet');
          setMinOrderQty(String(product.min_order_qty ?? 1));
          setBrand(product.brand ?? '');
          setSku(product.sku ?? '');
          const normalized = normalizeBulkTiers(product.bulk_pricing);
          setBulkTiers(
            normalized.map((t) => ({
              min_qty: String(t.min_qty),
              unit_price: String(t.unit_price),
            }))
          );
          setDeliveryOptions(product.delivery_options);
          setIsActive(product.is_active);
          setImageUrl(product.image_url);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Form yüklenemedi.';
        Alert.alert('Hata', message);
        navigation.goBack();
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id, productId, navigation]);

  const toggleDelivery = (option: DeliveryOption) => {
    setDeliveryOptions((prev) => {
      if (prev.includes(option)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== option);
      }
      return [...prev, option];
    });
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setLocalImageUri(asset.uri);
    setLocalImageMime(asset.mimeType ?? null);
  };

  const addBulkTier = () => {
    setBulkTiers((prev) => [...prev, { min_qty: '10', unit_price: '' }]);
  };

  const removeBulkTier = (idx: number) => {
    setBulkTiers((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateBulkTier = (
    idx: number,
    patch: Partial<{ min_qty: string; unit_price: string }>
  ) => {
    setBulkTiers((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row))
    );
  };

  const previewUri = localImageUri ?? imageUrl;

  const handleSave = async () => {
    if (!storeId) return;

    const parsedPrice = Number(price.replace(',', '.'));
    const parsedStock = Number.parseInt(stock, 10);
    const parsedMinQty = Math.max(1, Number.parseInt(minOrderQty, 10) || 1);

    const parsedBulkTiers: BulkPriceTier[] = bulkTiers
      .map((t) => ({
        min_qty: Number.parseInt(t.min_qty, 10),
        unit_price: Number(t.unit_price.replace(',', '.')),
      }))
      .filter(
        (t) =>
          !Number.isNaN(t.min_qty) &&
          t.min_qty >= 2 &&
          !Number.isNaN(t.unit_price) &&
          t.unit_price > 0
      );

    if (!name.trim()) {
      Alert.alert('Eksik bilgi', 'Ürün adı gerekli.');
      return;
    }
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Geçersiz fiyat', 'Fiyat 0 veya üzeri olmalı.');
      return;
    }
    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      Alert.alert('Geçersiz stok', 'Stok 0 veya üzeri olmalı.');
      return;
    }
    if (deliveryOptions.length === 0) {
      Alert.alert('Teslimat', 'En az bir teslimat seçeneği seç.');
      return;
    }
    if (!isEdit && !localImageUri && !imageUrl) {
      Alert.alert(
        'Ürün görseli gerekli',
        'Yeni ürün için bir fotoğraf seçmelisin.'
      );
      return;
    }

    try {
      setIsSaving(true);
      const basePayload = {
        name,
        description,
        price: parsedPrice,
        stock: parsedStock,
        delivery_options: deliveryOptions,
        image_url: imageUrl,
        category,
        unit,
        min_order_qty: parsedMinQty,
        bulk_pricing: parsedBulkTiers,
        brand: brand.trim() || null,
        sku: sku.trim() || null,
      };

      let savedId = productId;
      let finalImageUrl = imageUrl;

      if (isEdit && productId) {
        if (localImageUri) {
          finalImageUrl = await uploadProductImage(
            storeId,
            productId,
            localImageUri,
            localImageMime
          );
        }
        if (isActive && !finalImageUrl) {
          Alert.alert(
            'Görsel gerekli',
            'Aktif ürün için fotoğraf zorunlu. Galeriden seç veya pasif kaydet.'
          );
          return;
        }
        await updateProduct(productId, {
          ...basePayload,
          image_url: finalImageUrl,
          is_active: isActive,
        });
      } else {
        const created = await createProduct(storeId, {
          ...basePayload,
          is_active: false,
          image_url: null,
        });
        savedId = created.id;
        if (localImageUri && savedId) {
          try {
            finalImageUrl = await uploadProductImage(
              storeId,
              savedId,
              localImageUri,
              localImageMime
            );
          } catch (imageError) {
            const imageMessage =
              imageError instanceof Error
                ? imageError.message
                : 'Görsel yüklenemedi.';
            Alert.alert(
              'Görsel yüklenemedi',
              `${imageMessage}\n\nÜrün taslak olarak kaldı (pasif). Storage ayarını kontrol edip Düzenle ile tekrar dene.`
            );
            navigation.goBack();
            return;
          }
        }
        if (savedId) {
          await updateProduct(savedId, {
            ...basePayload,
            image_url: finalImageUrl,
            is_active: isActive,
          });
        }
      }

      navigation.goBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ürün kaydedilemedi.';
      Alert.alert('Hata', message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView className="flex-1 px-6 pt-4" keyboardShouldPersistTaps="handled">
        <View style={{ maxWidth: 820, width: '100%', alignSelf: 'center' }}>
          {!isEdit && planUsage ? (
            <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 p-3.5">
              <View className="flex-row items-center gap-2">
                <View className="rounded-lg bg-orange-100 p-1.5">
                  <Ionicons name="pricetag" size={16} color={ui.brand} />
                </View>
                <View>
                  <Text className="text-xs font-bold text-stone-800">
                    {planUsage.plan?.name ?? 'Aktif'} Paketi
                  </Text>
                  <Text className="text-[11px] text-stone-500">
                    Maksimum {planUsage.maxProducts} ürün kapasitesi
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-xs font-bold text-brand">
                  {planUsage.remainingSlots} hak kaldı
                </Text>
                <Text className="text-[10px] text-stone-400">
                  {planUsage.productCount} yüklendi
                </Text>
              </View>
            </View>
          ) : null}

          <Text className="mb-2 text-sm font-semibold text-gray-700">Ürün görseli *</Text>
          <View className="mb-4 overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50">
            <Pressable
              className="items-center justify-center"
              onPress={handlePickImage}
              style={{ height: 180 }}
            >
              {previewUri ? (
                <Image source={{ uri: previewUri }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="items-center px-6">
                  <View
                    className="mb-3 h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: ui.brandSoft }}
                  >
                    <Ionicons name="images-outline" size={28} color={ui.brand} />
                  </View>
                  <Text className="text-center text-sm font-semibold text-stone-800">
                    Ürün fotoğrafı ekle
                  </Text>
                  <Text className="mt-1 text-center text-xs text-stone-500">
                    Dokunarak galeriden veya bilgisayardan seç
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              className="flex-row items-center justify-center border-t border-stone-200 bg-white py-3.5"
              onPress={handlePickImage}
            >
              <Ionicons name="images" size={18} color={ui.brand} />
              <Text className="ml-2 text-sm font-bold text-brand">
                {previewUri ? 'Görseli değiştir' : 'Dosya / Galeriden seç'}
              </Text>
            </Pressable>
          </View>

          <Text className="mb-2 text-sm font-semibold text-gray-700">Ürün adı *</Text>
          <TextInput
            className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
            value={name}
            onChangeText={setName}
            placeholder="Örn. Nuh Çimento CEM I 42.5 (50 kg)"
          />

          {/* Category Picker */}
          <Text className="mb-2 text-sm font-semibold text-gray-700">Kategori</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-2">
              {PRODUCT_CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className={`rounded-xl border px-3.5 py-2 ${
                      active
                        ? 'border-brand bg-brand'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        active ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Brand & SKU */}
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="mb-1.5 text-sm font-semibold text-gray-700">
                Marka (İsteğe Bağlı)
              </Text>
              <TextInput
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900"
                value={brand}
                onChangeText={setBrand}
                placeholder="Örn: Filli Boya, Knauf"
              />
            </View>
            <View className="flex-1">
              <Text className="mb-1.5 text-sm font-semibold text-gray-700">
                Stok Kodu / SKU
              </Text>
              <TextInput
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900"
                value={sku}
                onChangeText={setSku}
                placeholder="Örn: CIM-425-50"
              />
            </View>
          </View>

          <Text className="mb-2 text-sm font-semibold text-gray-700">Açıklama & Teknik Özellikler</Text>
          <TextInput
            className="mb-3 min-h-[90px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
            value={description}
            onChangeText={setDescription}
            placeholder="Ebat, standart, palet adedi, uygulama alanı vb."
            multiline
            textAlignVertical="top"
          />

          {/* Unit Picker */}
          <Text className="mb-2 text-sm font-semibold text-gray-700">Satış Birimi *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-2">
              {PRODUCT_UNITS.map((u) => {
                const active = unit === u;
                return (
                  <Pressable
                    key={u}
                    onPress={() => setUnit(u)}
                    className={`rounded-xl border px-3.5 py-2 ${
                      active
                        ? 'border-slate-900 bg-slate-900'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        active ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {PRODUCT_UNIT_LABELS[u]} ({u})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="mb-1.5 text-sm font-semibold text-gray-700">
                Liste Birim Fiyatı (₺ / {unit}) *
              </Text>
              <TextInput
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>
            <View className="flex-1">
              <Text className="mb-1.5 text-sm font-semibold text-gray-700">
                Stok ({unit}) *
              </Text>
              <TextInput
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
                value={stock}
                onChangeText={setStock}
                keyboardType="number-pad"
              />
            </View>
            <View className="w-28">
              <Text className="mb-1.5 text-sm font-semibold text-gray-700">
                Min. Sipariş
              </Text>
              <TextInput
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-base text-gray-900 text-center"
                value={minOrderQty}
                onChangeText={setMinOrderQty}
                keyboardType="number-pad"
                placeholder="1"
              />
            </View>
          </View>

          {/* B2B Bulk Tiered Pricing Editor */}
          <View className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-1 pr-2">
                <Text className="text-sm font-extrabold text-emerald-950">
                  B2B Kademeli Toptan Fiyatlandırma
                </Text>
                <Text className="text-xs text-emerald-800 mt-0.5">
                  Şantiye alıcıları yüksek adet/palet aldığında birim fiyatı otomatik düşürür
                </Text>
              </View>
              <Pressable
                onPress={addBulkTier}
                className="flex-row items-center rounded-xl bg-emerald-700 px-3 py-2"
              >
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white ml-1">
                  Kademe Ekle
                </Text>
              </Pressable>
            </View>

            {bulkTiers.length === 0 ? (
              <Text className="text-xs text-emerald-700 italic">
                Henüz toptan fiyat kademesi eklenmedi (Örn: 20+ {unit} alımda indirimli birim fiyat).
              </Text>
            ) : (
              bulkTiers.map((tier, idx) => (
                <View key={idx} className="flex-row items-center gap-2 mt-2">
                  <View className="flex-1">
                    <Text className="text-[11px] font-bold text-emerald-900 mb-1">
                      Min. Miktar ({unit})
                    </Text>
                    <TextInput
                      value={tier.min_qty}
                      onChangeText={(v) => updateBulkTier(idx, { min_qty: v })}
                      keyboardType="number-pad"
                      placeholder="Örn: 50"
                      className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-bold text-slate-900"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[11px] font-bold text-emerald-900 mb-1">
                      İndirimli Birim Fiyat (₺ / {unit})
                    </Text>
                    <TextInput
                      value={tier.unit_price}
                      onChangeText={(v) => updateBulkTier(idx, { unit_price: v })}
                      keyboardType="decimal-pad"
                      placeholder="Örn: 185.00"
                      className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-bold text-slate-900"
                    />
                  </View>
                  <Pressable
                    onPress={() => removeBulkTier(idx)}
                    className="mt-5 px-2.5 py-2 rounded-lg bg-red-100"
                  >
                    <Feather name="trash-2" size={15} color="#DC2626" />
                  </Pressable>
                </View>
              ))
            )}
          </View>

          <Text className="mb-2 text-sm font-semibold text-gray-700">Teslimat seçenekleri *</Text>
          <View className="mb-4">
            {DELIVERY_OPTIONS.map((option) => {
              const selected = deliveryOptions.includes(option);
              return (
                <Pressable
                  key={option}
                  className={`mb-2 rounded-xl border px-4 py-3 ${selected ? 'border-brand bg-orange-50' : 'border-gray-200 bg-gray-50'}`}
                  onPress={() => toggleDelivery(option)}
                >
                  <Text className={`text-sm ${selected ? 'font-semibold text-brand' : 'text-gray-700'}`}>
                    {DELIVERY_OPTION_LABELS[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            className={`mb-6 rounded-xl border px-4 py-3 ${isActive ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
            onPress={() => setIsActive((prev) => !prev)}
          >
            <Text className={`text-sm font-medium ${isActive ? 'text-green-700' : 'text-gray-600'}`}>
              {isActive ? 'Aktif (katalogda görünür)' : 'Pasif (katalogda gizli)'}
            </Text>
          </Pressable>

          <Pressable
            className={`mb-10 items-center rounded-xl bg-brand py-3.5 ${isSaving ? 'opacity-70' : ''}`}
            disabled={isSaving}
            onPress={handleSave}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">
                {isEdit ? 'Ürünü Güncelle' : 'Ürünü Kaydet'}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

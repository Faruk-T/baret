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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../context/AuthContext';
import { DELIVERY_OPTION_LABELS, DELIVERY_OPTIONS } from '../../constants/enums';
import { createProduct, getProduct, updateProduct } from '../../services/products';
import { getMyStore } from '../../services/stores';
import { uploadProductImage } from '../../services/storage';
import type { DeliveryOption } from '../../types/database';
import type { SellerProductsStackParamList } from '../../types/navigation.types';
import { isLicenseValid } from '../../utils/license';
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
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>(['gel_al']);
  const [isActive, setIsActive] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [localImageMime, setLocalImageMime] = useState<string | null>(null);
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
            'Lisans gerekli',
            'Yeni ürün eklemek için geçerli bir satıcı lisansı gerekir. Mağaza sekmesinden anahtar aktive et.',
            [{ text: 'Tamam', onPress: () => navigation.goBack() }]
          );
          return;
        }
        if (!mounted) return;
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

  const previewUri = localImageUri ?? imageUrl;

  const handleSave = async () => {
    if (!storeId) return;

    const parsedPrice = Number(price.replace(',', '.'));
    const parsedStock = Number.parseInt(stock, 10);

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
        'Yeni ürün için galeriden bir fotoğraf seçmelisin.'
      );
      return;
    }

    let productSaved = false;

    try {
      setIsSaving(true);
      const payload = {
        name,
        description,
        price: parsedPrice,
        stock: parsedStock,
        delivery_options: deliveryOptions,
        is_active: isActive,
        image_url: imageUrl,
      };

      let savedId = productId;

      if (isEdit && productId) {
        await updateProduct(productId, payload);
        productSaved = true;
      } else {
        const created = await createProduct(storeId, payload);
        savedId = created.id;
        productSaved = true;
      }

      if (localImageUri && savedId) {
        try {
          const publicUrl = await uploadProductImage(
            storeId,
            savedId,
            localImageUri,
            localImageMime
          );
          await updateProduct(savedId, {
            ...payload,
            image_url: publicUrl,
          });
        } catch (imageError) {
          const imageMessage =
            imageError instanceof Error
              ? imageError.message
              : 'Görsel yüklenemedi.';
          Alert.alert(
            'Ürün kaydedildi',
            `Ürün listene eklendi ama görsel yüklenemedi.\n\n${imageMessage}\n\nSupabase Storage policy / bucket ayarını kontrol et; sonra Düzenle ile görseli tekrar yükleyebilirsin.`
          );
          navigation.goBack();
          return;
        }
      }

      navigation.goBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ürün kaydedilemedi.';
      Alert.alert(
        productSaved ? 'Ürün kaydedildi' : 'Hata',
        productSaved
          ? `Ürün kaydı tamam ama sonraki adımda hata oluştu:\n${message}`
          : message
      );
      if (productSaved) navigation.goBack();
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
        <Text className="mb-2 text-sm font-medium text-gray-700">Ürün görseli</Text>
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
                  Dokunarak galeriden seç
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
              {previewUri ? 'Galeriden değiştir' : 'Galeriden seç'}
            </Text>
          </Pressable>
        </View>

        <Text className="mb-2 text-sm font-medium text-gray-700">Ürün adı *</Text>
        <TextInput
          className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
          value={name}
          onChangeText={setName}
          placeholder="Örn. Nuh Çimento 50 kg"
        />

        <Text className="mb-2 text-sm font-medium text-gray-700">Açıklama</Text>
        <TextInput
          className="mb-3 min-h-[90px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />

        <Text className="mb-2 text-sm font-medium text-gray-700">Fiyat (₺) *</Text>
        <TextInput
          className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <Text className="mb-2 text-sm font-medium text-gray-700">Stok *</Text>
        <TextInput
          className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
          value={stock}
          onChangeText={setStock}
          keyboardType="number-pad"
        />

        <Text className="mb-2 text-sm font-medium text-gray-700">Teslimat seçenekleri *</Text>
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
              {isEdit ? 'Güncelle' : 'Ürünü Kaydet'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

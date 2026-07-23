import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../../context/AuthContext';
import { DELIVERY_OPTION_LABELS, DELIVERY_OPTIONS } from '../../constants/enums';
import { createProduct, getProduct, updateProduct } from '../../services/products';
import { getMyStore } from '../../services/stores';
import type { DeliveryOption } from '../../types/database';
import type { SellerProductsStackParamList } from '../../types/navigation.types';

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

    try {
      setIsSaving(true);
      const payload = {
        name,
        description,
        price: parsedPrice,
        stock: parsedStock,
        delivery_options: deliveryOptions,
        is_active: isActive,
      };

      if (isEdit && productId) {
        await updateProduct(productId, payload);
      } else {
        await createProduct(storeId, payload);
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

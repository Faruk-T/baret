import { useCallback, useEffect, useState } from 'react';
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

import { useAuth } from '../../context/AuthContext';
import {
  createStore,
  getMyStore,
  updateStore,
  type StoreFormInput,
} from '../../services/stores';
import type { Store } from '../../types/database';
import { getCurrentCoords } from '../../utils/geo';

const emptyForm: StoreFormInput = {
  name: '',
  description: '',
  address: '',
  city: '',
  district: '',
  phone: '',
  email: '',
};

export function StoreSettingsScreen() {
  const { user, signOut } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [form, setForm] = useState<StoreFormInput>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [coords, setCoords] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });

  const loadStore = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const existing = await getMyStore(user.id);
      setStore(existing);
      if (existing) {
        setForm({
          name: existing.name,
          description: existing.description ?? '',
          address: existing.address,
          city: existing.city,
          district: existing.district ?? '',
          phone: existing.phone,
          email: existing.email ?? '',
        });
        setCoords({
          latitude: existing.latitude,
          longitude: existing.longitude,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Mağaza bilgisi alınamadı.';
      Alert.alert('Hata', message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  const updateField = (key: keyof StoreFormInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user?.id) return;

    if (!form.name.trim() || !form.address.trim() || !form.city.trim() || !form.phone.trim()) {
      Alert.alert('Eksik bilgi', 'Mağaza adı, adres, şehir ve telefon zorunludur.');
      return;
    }

    try {
      setIsSaving(true);
      const saved = store
        ? await updateStore(store.id, {
            ...form,
            latitude: coords.latitude,
            longitude: coords.longitude,
          })
        : await createStore(user.id, {
            ...form,
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
      setStore(saved);
      setCoords({
        latitude: saved.latitude,
        longitude: saved.longitude,
      });
      Alert.alert(
        'Kaydedildi',
        store
          ? 'Mağaza bilgileri güncellendi.'
          : 'Mağaza oluşturuldu. Admin onayından sonra alıcılara görünür.'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Mağaza kaydedilemedi.';
      Alert.alert('Hata', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Çıkış yapılamadı.';
      Alert.alert('Hata', message);
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleCaptureLocation = async () => {
    try {
      setIsLocating(true);
      const next = await getCurrentCoords();
      setCoords(next);
      Alert.alert(
        'Konum alındı',
        `${next.latitude.toFixed(5)}, ${next.longitude.toFixed(5)}\nKaydet’e basarak mağazaya yaz.`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Konum alınamadı.';
      Alert.alert('Konum', message);
    } finally {
      setIsLocating(false);
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
        <Text className="mb-1 text-2xl font-bold text-gray-900">
          {store ? 'Mağaza Ayarları' : 'Mağaza Oluştur'}
        </Text>
        <Text className="mb-4 text-sm text-gray-500">{user?.email}</Text>

        {store ? (
          <View className="mb-4 rounded-xl bg-gray-50 px-4 py-3">
            <Text className="text-sm text-gray-700">
              Onay durumu:{' '}
              <Text className={store.is_approved ? 'font-semibold text-green-600' : 'font-semibold text-orange-600'}>
                {store.is_approved ? 'Onaylandı' : 'Onay bekliyor'}
              </Text>
            </Text>
          </View>
        ) : null}

        <Field label="Mağaza adı *" value={form.name} onChangeText={(v) => updateField('name', v)} />
        <Field
          label="Açıklama"
          value={form.description ?? ''}
          onChangeText={(v) => updateField('description', v)}
          multiline
        />
        <Field label="Adres *" value={form.address} onChangeText={(v) => updateField('address', v)} />
        <Field label="Şehir *" value={form.city} onChangeText={(v) => updateField('city', v)} />
        <Field
          label="İlçe"
          value={form.district ?? ''}
          onChangeText={(v) => updateField('district', v)}
        />
        <Field
          label="Telefon *"
          value={form.phone}
          onChangeText={(v) => updateField('phone', v)}
          keyboardType="phone-pad"
        />
        <Field
          label="E-posta"
          value={form.email ?? ''}
          onChangeText={(v) => updateField('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View className="mb-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <Text className="mb-1 text-sm font-medium text-stone-700">Harita konumu</Text>
          <Text className="mb-3 text-xs text-stone-500">
            Alıcılar mağazaya uzaklığı görebilsin ve Haritalar’da yol tarifi alsın.
          </Text>
          {coords.latitude != null && coords.longitude != null ? (
            <Text className="mb-3 text-sm text-green-700">
              Kayıtlı: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
            </Text>
          ) : (
            <Text className="mb-3 text-sm text-amber-700">Henüz konum yok</Text>
          )}
          <Pressable
            className={`items-center rounded-xl border border-brand bg-orange-50 py-3 ${
              isLocating ? 'opacity-70' : ''
            }`}
            disabled={isLocating}
            onPress={() => void handleCaptureLocation()}
          >
            {isLocating ? (
              <ActivityIndicator color="#FF6B00" />
            ) : (
              <Text className="font-semibold text-brand">Telefon konumunu kullan</Text>
            )}
          </Pressable>
        </View>

        <Pressable
          className={`mb-4 items-center rounded-xl bg-brand py-3.5 ${isSaving ? 'opacity-70' : ''}`}
          disabled={isSaving}
          onPress={() => void handleSave()}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {store ? 'Güncelle' : 'Mağazayı Oluştur'}
            </Text>
          )}
        </Pressable>

        <Pressable
          className={`mb-10 items-center rounded-xl border border-red-200 bg-red-50 py-3.5 ${isSigningOut ? 'opacity-70' : ''}`}
          disabled={isSigningOut}
          onPress={handleSignOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#DC2626" />
          ) : (
            <Text className="text-base font-semibold text-red-600">Çıkış Yap</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences';
};

function Field({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: FieldProps) {
  return (
    <View className="mb-3">
      <Text className="mb-2 text-sm font-medium text-gray-700">{label}</Text>
      <TextInput
        className={`rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 ${multiline ? 'min-h-[90px]' : ''}`}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

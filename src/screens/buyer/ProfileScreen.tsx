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

import { USER_ROLE_LABELS } from '../../constants/enums';
import { useAuth } from '../../context/AuthContext';

export function ProfileScreen() {
  const { user, signOut, updateProfile } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setFullName(user?.full_name ?? '');
      setPhone(user?.phone ?? '');
    }
  }, [user, editing]);

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

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProfile({ full_name: fullName, phone });
      setEditing(false);
      Alert.alert('Kaydedildi', 'Profil bilgilerin güncellendi.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Profil güncellenemedi.';
      Alert.alert('Hata', message);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setFullName(user?.full_name ?? '');
    setPhone(user?.phone ?? '');
    setEditing(false);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-stone-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-6 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-4 rounded-2xl border border-stone-200 bg-white p-5">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Hesap
            </Text>
            {!editing ? (
              <Pressable onPress={() => setEditing(true)}>
                <Text className="text-sm font-semibold text-brand">Düzenle</Text>
              </Pressable>
            ) : (
              <Pressable onPress={cancelEdit}>
                <Text className="text-sm font-medium text-stone-500">Vazgeç</Text>
              </Pressable>
            )}
          </View>

          {editing ? (
            <>
              <Text className="mb-1 text-sm font-medium text-stone-700">Ad Soyad</Text>
              <TextInput
                className="mb-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-stone-900"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Adınız Soyadınız"
              />
              <Text className="mb-1 text-sm font-medium text-stone-700">Telefon</Text>
              <TextInput
                className="mb-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-stone-900"
                value={phone}
                onChangeText={setPhone}
                placeholder="05xxxxxxxxx"
                keyboardType="phone-pad"
              />
              <Text className="mb-1 text-sm font-medium text-stone-700">E-posta</Text>
              <Text className="mb-1 rounded-xl border border-stone-100 bg-stone-100 px-3 py-3 text-stone-500">
                {user?.email}
              </Text>
              <Text className="mb-4 text-xs text-stone-400">
                E-posta giriş için kullanılır; burada değiştirilemez.
              </Text>
              <Pressable
                className={`items-center rounded-xl bg-brand py-3.5 ${saving ? 'opacity-70' : ''}`}
                disabled={saving}
                onPress={() => void handleSave()}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-semibold text-white">Kaydet</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text className="mt-1 text-2xl font-bold text-stone-900">
                {user?.full_name || 'İsimsiz kullanıcı'}
              </Text>
              <Text className="mt-1 text-sm text-stone-500">{user?.email}</Text>
              <Text className="mt-1 text-sm text-stone-500">
                {user?.phone || 'Telefon eklenmemiş'}
              </Text>
              <Text className="mt-3 self-start rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-brand">
                {user?.role ? USER_ROLE_LABELS[user.role] : '—'}
              </Text>
            </>
          )}
        </View>

        <Text className="mb-3 px-1 text-sm text-stone-500">
          Baret — inşaat & nalbur pazaryeri. Sipariş ve mağaza işlemlerin bu hesapla
          bağlıdır.
        </Text>

        <Pressable
          className={`items-center rounded-2xl border border-red-200 bg-red-50 py-4 ${
            isSigningOut ? 'opacity-70' : ''
          }`}
          disabled={isSigningOut || editing}
          onPress={() => void handleSignOut()}
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

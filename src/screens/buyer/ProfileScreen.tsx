import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BrandHero } from '../../components/ui/BrandHero';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { UiCard } from '../../components/ui/UiCard';
import { USER_ROLE_LABELS } from '../../constants/enums';
import { useAuth } from '../../context/AuthContext';
import { ui } from '../../theme/ui';

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
      className="flex-1 bg-[#FFF8F3]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <BrandHero
          compact
          eyebrow="Profil"
          title={user?.full_name || 'Hesabım'}
          subtitle={USER_ROLE_LABELS[user?.role ?? 'buyer']}
          right={
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <Ionicons name="person" size={28} color="#fff" />
            </View>
          }
        />

        <View className="-mt-4 rounded-t-3xl bg-[#FFF8F3] px-4 pt-6">
          <UiCard className="mb-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-xs font-bold uppercase tracking-wide text-stone-500">
                Hesap bilgileri
              </Text>
              {!editing ? (
                <Pressable onPress={() => setEditing(true)}>
                  <Text className="text-sm font-bold text-brand">Düzenle</Text>
                </Pressable>
              ) : (
                <Pressable onPress={cancelEdit}>
                  <Text className="text-sm font-medium text-stone-500">Vazgeç</Text>
                </Pressable>
              )}
            </View>

            {editing ? (
              <>
                <Text className="mb-1 text-sm font-semibold text-stone-700">Ad Soyad</Text>
                <TextInput
                  className="mb-3 rounded-xl border border-stone-200 bg-[#FFF8F3] px-3 py-3 text-stone-900"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Adınız Soyadınız"
                  placeholderTextColor="#a8a29e"
                />
                <Text className="mb-1 text-sm font-semibold text-stone-700">Telefon</Text>
                <TextInput
                  className="mb-3 rounded-xl border border-stone-200 bg-[#FFF8F3] px-3 py-3 text-stone-900"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="05xxxxxxxxx"
                  placeholderTextColor="#a8a29e"
                  keyboardType="phone-pad"
                />
                <Text className="mb-1 text-sm font-semibold text-stone-700">E-posta</Text>
                <Text className="mb-1 rounded-xl border border-stone-100 bg-stone-100 px-3 py-3 text-stone-500">
                  {user?.email}
                </Text>
                <Text className="mb-4 text-xs text-stone-400">
                  E-posta giriş kimliğidir; burada değiştirilemez.
                </Text>
                <PrimaryButton
                  label="Kaydet"
                  loading={saving}
                  onPress={() => void handleSave()}
                />
              </>
            ) : (
              <>
                <Text className="text-2xl font-bold text-stone-900">
                  {user?.full_name || 'İsimsiz kullanıcı'}
                </Text>
                <Text className="mt-2 text-sm text-stone-500">{user?.email}</Text>
                <Text className="mt-1 text-sm text-stone-500">
                  {user?.phone || 'Telefon eklenmemiş'}
                </Text>
                <View
                  className="mt-4 self-start rounded-full px-3 py-1"
                  style={{ backgroundColor: ui.brandSoft }}
                >
                  <Text className="text-xs font-bold text-brand">
                    {user?.role ? USER_ROLE_LABELS[user.role] : '—'}
                  </Text>
                </View>
              </>
            )}
          </UiCard>

          <Text className="mb-4 px-1 text-sm leading-5 text-stone-500">
            Baret — inşaat & nalbur pazaryeri. Siparişlerin bu hesapla bağlıdır.
            Platform dışı telefon / WhatsApp anlaşması kullanım şartlarına aykırıdır;
            tekrarlayan ihlallerde hesap askıya alınabilir.
          </Text>

          <PrimaryButton
            label="Çıkış Yap"
            variant="danger"
            loading={isSigningOut}
            disabled={editing}
            onPress={() => void handleSignOut()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { USER_ROLE_LABELS } from '../../constants/enums';
import { useAuth } from '../../context/AuthContext';

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  return (
    <View className="flex-1 bg-stone-50 px-4 pt-6">
      <View className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
        <Text className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Hesap
        </Text>
        <Text className="mt-2 text-2xl font-bold text-stone-900">
          {user?.full_name || 'İsimsiz kullanıcı'}
        </Text>
        <Text className="mt-1 text-sm text-stone-500">{user?.email}</Text>
        {user?.phone ? (
          <Text className="mt-1 text-sm text-stone-500">{user.phone}</Text>
        ) : null}
        <Text className="mt-3 self-start rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-brand">
          {user?.role ? USER_ROLE_LABELS[user.role] : '—'}
        </Text>
      </View>

      <Text className="mb-3 px-1 text-sm text-stone-500">
        Baret — inşaat & nalbur pazaryeri. Sipariş ve mağaza işlemlerin bu hesapla
        bağlıdır.
      </Text>

      <Pressable
        className={`items-center rounded-2xl border border-red-200 bg-red-50 py-4 ${
          isSigningOut ? 'opacity-70' : ''
        }`}
        disabled={isSigningOut}
        onPress={() => void handleSignOut()}
      >
        {isSigningOut ? (
          <ActivityIndicator color="#DC2626" />
        ) : (
          <Text className="text-base font-semibold text-red-600">Çıkış Yap</Text>
        )}
      </Pressable>
    </View>
  );
}

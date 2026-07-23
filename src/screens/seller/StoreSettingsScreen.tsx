import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { useAuth } from '../../context/AuthContext';

export function StoreSettingsScreen() {
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
    <View className="flex-1 bg-white px-6 pt-10">
      <Text className="mb-2 text-2xl font-bold text-gray-900">Mağaza Ayarları</Text>
      <Text className="mb-1 text-base text-gray-700">{user?.full_name || 'Satıcı'}</Text>
      <Text className="mb-8 text-sm text-gray-500">{user?.email}</Text>
      <Text className="mb-8 text-sm text-gray-500">
        Mağaza profil formu bir sonraki pakette eklenecek.
      </Text>

      <Pressable
        className={`items-center rounded-xl border border-red-200 bg-red-50 py-3.5 ${isSigningOut ? 'opacity-70' : ''}`}
        disabled={isSigningOut}
        onPress={handleSignOut}
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

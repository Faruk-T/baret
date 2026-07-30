import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../context/AuthContext';
import { listPendingStores } from '../../services/stores';
import type { AdminStackParamList } from '../../types/navigation.types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'AdminHome'>;

export function AdminHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user, signOut } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const pending = await listPendingStores();
      setPendingCount(pending.length);
    } catch {
      setPendingCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Çıkış yapılamadı.';
      Alert.alert('Hata', message);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-stone-50"
      contentContainerClassName="px-4 py-5 pb-10"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor="#FF6B00"
        />
      }
    >
      <View className="mb-5 rounded-2xl border border-stone-200 bg-white p-4">
        <Text className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Yönetici
        </Text>
        <Text className="mt-1 text-xl font-bold text-stone-900">
          {user?.full_name || 'Admin'}
        </Text>
        <Text className="mt-1 text-sm text-stone-500">{user?.email}</Text>
        <Text className="mt-2 self-start rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-brand">
          Rol: admin
        </Text>
      </View>

      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
        Menü
      </Text>

      <Pressable
        className="mb-3 flex-row items-center justify-between rounded-2xl border border-stone-200 bg-white p-4"
        onPress={() => navigation.navigate('SellerApprovals')}
      >
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-stone-900">Satıcı onayları</Text>
          <Text className="mt-1 text-sm text-stone-500">
            Mağaza onayla, geri al veya pasife al
          </Text>
        </View>
        <View className="min-w-[36px] items-center rounded-full bg-brand px-2.5 py-1">
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="font-bold text-white">{pendingCount}</Text>
          )}
        </View>
      </Pressable>

      <Pressable
        className="mb-3 rounded-2xl border border-stone-200 bg-white p-4"
        onPress={() => navigation.navigate('UserManagement')}
      >
        <Text className="text-base font-semibold text-stone-900">Kullanıcılar</Text>
        <Text className="mt-1 text-sm text-stone-500">Kayıtlı kullanıcı listesi ve roller</Text>
      </Pressable>

      <Pressable
        className="mb-6 rounded-2xl border border-stone-200 bg-white p-4"
        onPress={() => navigation.navigate('PlatformStats')}
      >
        <Text className="text-base font-semibold text-stone-900">İstatistikler</Text>
        <Text className="mt-1 text-sm text-stone-500">Kullanıcı, mağaza, sipariş, yorum sayıları</Text>
      </Pressable>

      <Pressable
        className={`items-center rounded-2xl border border-red-200 bg-red-50 py-4 ${
          signingOut ? 'opacity-70' : ''
        }`}
        disabled={signingOut}
        onPress={() => void handleSignOut()}
      >
        {signingOut ? (
          <ActivityIndicator color="#DC2626" />
        ) : (
          <Text className="text-base font-semibold text-red-600">Çıkış Yap</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

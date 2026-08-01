import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { UiCard } from '../../components/ui/UiCard';
import { getPlatformStats, type PlatformStats } from '../../services/admin';
import type { AdminStackParamList } from '../../types/navigation.types';
import { ui } from '../../theme/ui';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'PlatformStats'>;

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <UiCard className="mb-3 w-[48%]">
      <Text className="text-3xl font-bold text-brand">{value}</Text>
      <Text className="mt-1 text-sm text-stone-600">{label}</Text>
    </UiCard>
  );
}

export function AdminDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getPlatformStats();
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İstatistikler yüklenemedi.');
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator color={ui.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#FFF8F3]"
      contentContainerClassName="px-4 py-4 pb-10"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={ui.brand}
        />
      }
    >
      <Text className="mb-1 text-2xl font-bold text-stone-900">Platform özeti</Text>
      <Text className="mb-4 text-sm text-stone-500">Canlı sayılar · yönetici paneli</Text>

      {error ? (
        <Text className="mb-4 text-sm text-red-600">{error}</Text>
      ) : null}

      {stats ? (
        <>
          <Text className="mb-2 text-xs font-bold uppercase text-stone-500">
            İnsanlar
          </Text>
          <View className="mb-4 flex-row flex-wrap justify-between">
            <StatCard label="Alıcı" value={stats.buyers} />
            <StatCard label="Satıcı" value={stats.sellers} />
          </View>

          <Text className="mb-2 text-xs font-bold uppercase text-stone-500">
            Platform
          </Text>
          <View className="flex-row flex-wrap justify-between">
            <StatCard label="Kullanıcı" value={stats.users} />
            <StatCard label="Mağaza" value={stats.stores} />
            <StatCard label="Onay bekleyen" value={stats.pendingStores} />
            <StatCard label="Ürün" value={stats.products} />
            <StatCard label="Sipariş" value={stats.orders} />
            <StatCard label="Yorum" value={stats.reviews} />
          </View>
        </>
      ) : null}

      <Pressable
        className="mt-2 items-center rounded-2xl bg-brand py-3.5"
        style={ui.shadow}
        onPress={() => navigation.navigate('PeopleHub')}
      >
        <Text className="font-bold text-white">Alıcı & satıcı yönetimine git</Text>
      </Pressable>
      <Pressable
        className="mt-2 items-center rounded-2xl border border-brand bg-white py-3.5"
        onPress={() => navigation.navigate('SellerApprovals')}
      >
        <Text className="font-bold text-brand">Satıcı onaylarına git</Text>
      </Pressable>
    </ScrollView>
  );
}

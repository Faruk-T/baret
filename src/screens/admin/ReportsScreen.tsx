import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  listPlatformReportsAdmin,
  updatePlatformReportStatus,
} from '../../services/reports';
import type { PlatformReport } from '../../types/database';
import { ui } from '../../theme/ui';

const STATUS_LABEL: Record<PlatformReport['status'], string> = {
  open: 'Açık',
  reviewed: 'İncelendi',
  closed: 'Kapalı',
};

export function ReportsScreen() {
  const [rows, setRows] = useState<PlatformReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listPlatformReportsAdmin();
      setRows(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Şikayetler yüklenemedi. anti-leakage SQL çalıştı mı?'
      );
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

  const setStatus = (item: PlatformReport, status: PlatformReport['status']) => {
    Alert.alert('Durum güncelle', `"${STATUS_LABEL[status]}" yapılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Güncelle',
        onPress: () => {
          void (async () => {
            try {
              await updatePlatformReportStatus(item.id, status);
              await load();
            } catch (e) {
              Alert.alert(
                'Hata',
                e instanceof Error ? e.message : 'Güncellenemedi.'
              );
            }
          })();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator color={ui.brand} />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-[#FFF8F3]"
      data={rows}
      keyExtractor={(item) => item.id}
      contentContainerClassName="px-4 py-3 pb-10"
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
      ListHeaderComponent={
        <View className="mb-3">
          <Text className="text-sm text-stone-500">
            {rows.length} şikayet · platform dışı anlaşma / sızıntı
          </Text>
          {error ? (
            <Text className="mt-2 text-sm text-red-600">{error}</Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <Text className="mt-10 text-center text-sm text-stone-500">
          Açık şikayet yok.
        </Text>
      }
      renderItem={({ item }) => (
        <View className="mb-3 rounded-2xl border border-stone-200 bg-white p-4">
          <View className="mb-2 flex-row items-start justify-between">
            <Text className="flex-1 pr-2 font-bold text-stone-900">{item.reason}</Text>
            <View className="rounded-full bg-orange-50 px-2.5 py-1">
              <Text className="text-xs font-bold text-brand">
                {STATUS_LABEL[item.status]}
              </Text>
            </View>
          </View>
          {item.details ? (
            <Text className="mb-2 text-sm text-stone-600">{item.details}</Text>
          ) : null}
          <Text className="text-xs text-stone-400">
            Mağaza: {item.store_id.slice(0, 8)}…
            {item.order_id ? ` · Sipariş: ${item.order_id.slice(0, 8)}…` : ''}
          </Text>
          <Text className="mt-1 text-xs text-stone-400">
            {new Date(item.created_at).toLocaleString('tr-TR')}
          </Text>
          {item.status === 'open' ? (
            <View className="mt-3 flex-row gap-2">
              <Pressable
                className="rounded-xl bg-brand px-3 py-2"
                onPress={() => setStatus(item, 'reviewed')}
              >
                <Text className="text-xs font-bold text-white">İncelendi</Text>
              </Pressable>
              <Pressable
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
                onPress={() => setStatus(item, 'closed')}
              >
                <Text className="text-xs font-bold text-stone-700">Kapat</Text>
              </Pressable>
            </View>
          ) : item.status === 'reviewed' ? (
            <Pressable
              className="mt-3 self-start rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
              onPress={() => setStatus(item, 'closed')}
            >
              <Text className="text-xs font-bold text-stone-700">Kapat</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    />
  );
}

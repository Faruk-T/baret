import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../context/AuthContext';
import {
  listMyNotifications,
  markNotificationRead,
} from '../../services/adminOps';
import type { AppNotification } from '../../types/database';
import { ui } from '../../theme/ui';

function formatWhen(iso: string): string {
  const created = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - created) / 1000));
  if (diffSec < 60) return `${diffSec} sn önce`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} sa önce`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} gün önce`;
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SellerNotificationsScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    try {
      setRows(await listMyNotifications(user.id));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

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
    <FlatList
      className="flex-1 bg-[#FFF8F3]"
      contentContainerClassName="px-4 py-4 pb-10"
      data={rows}
      keyExtractor={(item) => item.id}
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
        <Text className="mb-3 text-sm text-stone-500">
          Bildirimler silinmez; okuduğunda soluklaşır. Zaman damgası oluşturulma
          anından itibaren gösterilir.
        </Text>
      }
      ListEmptyComponent={
        <Text className="mt-10 text-center text-stone-500">
          Henüz bildirim yok.
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          className={`mb-2 rounded-2xl border px-3 py-3 ${
            item.is_read
              ? 'border-stone-200 bg-white'
              : 'border-orange-200 bg-orange-50'
          }`}
          onPress={() => {
            if (!item.is_read) {
              void markNotificationRead(item.id).then(() => load());
            }
          }}
        >
          <View className="flex-row items-start justify-between">
            <Text className="flex-1 pr-2 text-sm font-bold text-stone-900">
              {item.title}
            </Text>
            <Text className="text-[11px] text-stone-400">
              {formatWhen(item.created_at)}
            </Text>
          </View>
          <Text className="mt-1 text-sm text-stone-600">{item.body}</Text>
          {!item.is_read ? (
            <Text className="mt-2 text-[11px] font-semibold text-brand">
              Okunmadı · dokunarak işaretle
            </Text>
          ) : null}
        </Pressable>
      )}
    />
  );
}

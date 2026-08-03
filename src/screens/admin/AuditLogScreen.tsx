import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { listAuditLogs } from '../../services/adminOps';
import type { AdminAuditLog } from '../../types/database';
import { ui } from '../../theme/ui';

export function AuditLogScreen() {
  const [rows, setRows] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows(await listAuditLogs());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Audit log yok. docs/admin-ops-v2-setup.sql çalıştır.'
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
          <Text className="text-2xl font-bold text-stone-900">Audit log</Text>
          <Text className="mt-1 text-sm text-stone-500">
            Kim ne yaptı · onay, tahsilat, askıya alma
          </Text>
          {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        <Text className="mt-10 text-center text-sm text-stone-500">
          Henüz kayıt yok.
        </Text>
      }
      renderItem={({ item }) => (
        <View className="mb-2 rounded-2xl border border-stone-200 bg-white px-3 py-3">
          <Text className="font-bold text-stone-900">{item.action}</Text>
          <Text className="mt-1 text-xs text-stone-500">
            {item.entity_type}
            {item.entity_id ? ` · ${item.entity_id.slice(0, 8)}…` : ''}
          </Text>
          <Text className="mt-1 text-xs text-stone-400">
            {new Date(item.created_at).toLocaleString('tr-TR')}
          </Text>
        </View>
      )}
    />
  );
}

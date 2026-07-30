import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { USER_ROLE_LABELS } from '../../constants/enums';
import { listUsersAdmin } from '../../services/admin';
import type { User } from '../../types/database';

export function UserManagementScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listUsersAdmin();
      setUsers(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Kullanıcı listesi yüklenemedi (admin RLS gerekir).'
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
      <View className="flex-1 items-center justify-center bg-stone-50">
        <ActivityIndicator color="#FF6B00" />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-stone-50"
      data={users}
      keyExtractor={(item) => item.id}
      contentContainerClassName="px-4 py-3"
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
      ListHeaderComponent={
        <View className="mb-3">
          <Text className="text-sm text-stone-500">{users.length} kullanıcı</Text>
          {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        <Text className="mt-10 text-center text-sm text-stone-500">
          Kullanıcı bulunamadı.
        </Text>
      }
      renderItem={({ item }) => (
        <View className="mb-3 rounded-2xl border border-stone-200 bg-white p-4">
          <Text className="text-base font-semibold text-stone-900">
            {item.full_name || 'İsimsiz'}
          </Text>
          <Text className="mt-1 text-sm text-stone-500">{item.email}</Text>
          <View className="mt-2 self-start rounded-full bg-orange-50 px-3 py-1">
            <Text className="text-xs font-semibold text-brand">
              {USER_ROLE_LABELS[item.role]}
            </Text>
          </View>
          {item.phone ? (
            <Text className="mt-2 text-xs text-stone-400">{item.phone}</Text>
          ) : null}
        </View>
      )}
    />
  );
}

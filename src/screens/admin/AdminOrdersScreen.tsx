import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';

import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '../../constants/enums';
import { listOrdersAdmin, type AdminOrderRow } from '../../services/adminOrders';
import type { OrderStatus } from '../../types/database';
import { ui } from '../../theme/ui';

type Filter = OrderStatus | 'all';

function money(value: number): string {
  return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

export function AdminOrdersScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const [rows, setRows] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows(await listOrdersAdmin({ status: filter }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Siparişler yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const chips = useMemo(
    () => [
      { id: 'all' as const, label: 'Tümü' },
      ...ORDER_STATUSES.map((s) => ({ id: s, label: ORDER_STATUS_LABELS[s] })),
    ],
    []
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
          <Text className="text-2xl font-bold text-stone-900">Sipariş merkezi</Text>
          <Text className="mt-1 text-sm text-stone-500">
            Tüm mağazaların siparişleri · filtrele ve incele
          </Text>
          {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}

          <View className="mt-3 flex-row flex-wrap gap-2">
            {chips.map((chip) => {
              const active = filter === chip.id;
              return (
                <Pressable
                  key={chip.id}
                  className={`rounded-full px-3 py-1.5 ${
                    active ? 'bg-brand' : 'border border-stone-200 bg-white'
                  }`}
                  onPress={() => setFilter(chip.id)}
                >
                  <Text
                    className={`text-xs font-bold ${
                      active ? 'text-white' : 'text-stone-600'
                    }`}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      }
      ListEmptyComponent={
        <Text className="mt-10 text-center text-sm text-stone-500">
          Bu filtrede sipariş yok.
        </Text>
      }
      renderItem={({ item }) => (
        <View className="mb-3 rounded-3xl border border-stone-200 bg-white p-4">
          <View className="mb-2 flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="font-bold text-stone-900">
                {item.products?.name ?? 'Ürün'}
              </Text>
              <Text className="mt-0.5 text-xs text-stone-500">
                {item.stores?.name ?? 'Mağaza'}
                {item.stores?.city ? ` · ${item.stores.city}` : ''}
              </Text>
            </View>
            <View className="rounded-full bg-orange-50 px-2.5 py-1">
              <Text className="text-[10px] font-bold text-brand">
                {ORDER_STATUS_LABELS[item.status]}
              </Text>
            </View>
          </View>
          <Text className="text-sm font-bold text-brand">
            {money(Number(item.total_amount))} · {item.quantity} adet
          </Text>
          <Text className="mt-1 text-xs text-stone-500">
            Alıcı:{' '}
            {item.users?.full_name || item.users?.email || item.buyer_id.slice(0, 8)}
          </Text>
          <Text className="mt-1 text-xs text-stone-400">
            {new Date(item.created_at).toLocaleString('tr-TR')}
          </Text>
        </View>
      )}
    />
  );
}

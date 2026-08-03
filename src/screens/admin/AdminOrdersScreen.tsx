import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '../../constants/enums';
import { useAuth } from '../../context/AuthContext';
import { listOrdersAdmin, type AdminOrderRow } from '../../services/adminOrders';
import {
  updateOrderStatusAdmin,
  writeAuditLog,
} from '../../services/adminOps';
import type { OrderStatus } from '../../types/database';
import { toCsv } from '../../utils/csv';
import { ui } from '../../theme/ui';

type Filter = OrderStatus | 'all';

function money(value: number): string {
  return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

export function AdminOrdersScreen() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const [cityQuery, setCityQuery] = useState('');
  const [storeQuery, setStoreQuery] = useState('');
  const [rows, setRows] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows(await listOrdersAdmin({ status: filter, limit: 200 }));
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

  const filtered = useMemo(() => {
    const city = cityQuery.trim().toLocaleLowerCase('tr-TR');
    const store = storeQuery.trim().toLocaleLowerCase('tr-TR');
    return rows.filter((r) => {
      if (city && !(r.stores?.city ?? '').toLocaleLowerCase('tr-TR').includes(city)) {
        return false;
      }
      if (
        store &&
        !(r.stores?.name ?? '').toLocaleLowerCase('tr-TR').includes(store)
      ) {
        return false;
      }
      return true;
    });
  }, [rows, cityQuery, storeQuery]);

  const allowedAdminNext = (status: OrderStatus): OrderStatus[] => {
    switch (status) {
      case 'pending':
        return ['preparing', 'cancelled'];
      case 'preparing':
        return ['shipped', 'cancelled', 'pending'];
      case 'shipped':
        return ['delivered', 'cancelled', 'preparing'];
      default:
        return [];
    }
  };

  const intervene = (item: AdminOrderRow) => {
    const options = allowedAdminNext(item.status);
    if (options.length === 0) {
      Alert.alert(
        'Müdahale',
        'Bu durumda değiştirilebilir geçiş yok (teslim / iptal edilmiş).'
      );
      return;
    }
    Alert.alert(
      'Siparişe müdahale',
      `${item.products?.name ?? 'Ürün'} · şu an ${ORDER_STATUS_LABELS[item.status]}`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        ...options.map((status) => ({
          text: ORDER_STATUS_LABELS[status],
          onPress: () => {
            void (async () => {
              try {
                await updateOrderStatusAdmin(item.id, status);
                if (user?.id) {
                  await writeAuditLog({
                    actorId: user.id,
                    action: 'order.status_override',
                    entityType: 'order',
                    entityId: item.id,
                    meta: { from: item.status, to: status },
                  });
                }
                await load();
              } catch (e) {
                Alert.alert(
                  'Hata',
                  e instanceof Error ? e.message : 'Güncellenemedi.'
                );
              }
            })();
          },
        })),
      ]
    );
  };

  const exportCsv = () => {
    const csv = toCsv(
      ['Tarih', 'Ürün', 'Mağaza', 'Şehir', 'Alıcı', 'Durum', 'Tutar', 'Adet'],
      filtered.map((r) => [
        new Date(r.created_at).toLocaleString('tr-TR'),
        r.products?.name ?? '',
        r.stores?.name ?? '',
        r.stores?.city ?? '',
        r.users?.email ?? r.buyer_id,
        ORDER_STATUS_LABELS[r.status],
        r.total_amount,
        r.quantity,
      ])
    );
    void Share.share({ message: csv, title: 'baret-siparisler.csv' });
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
      data={filtered}
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
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-2xl font-bold text-stone-900">
                Sipariş merkezi
              </Text>
              <Text className="mt-1 text-sm text-stone-500">
                Durum · şehir · mağaza · müdahale
              </Text>
            </View>
            <Pressable className="rounded-xl bg-brand px-3 py-2" onPress={exportCsv}>
              <Text className="text-xs font-bold text-white">CSV</Text>
            </Pressable>
          </View>
          {error ? <Text className="mb-2 text-sm text-red-600">{error}</Text> : null}

          <TextInput
            className="mb-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm"
            placeholder="Şehir filtrele"
            placeholderTextColor="#a8a29e"
            value={cityQuery}
            onChangeText={setCityQuery}
          />
          <TextInput
            className="mb-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm"
            placeholder="Mağaza adı filtrele"
            placeholderTextColor="#a8a29e"
            value={storeQuery}
            onChangeText={setStoreQuery}
          />

          <View className="flex-row flex-wrap gap-2">
            {([{ id: 'all' as const, label: 'Tümü' }, ...ORDER_STATUSES.map((s) => ({
              id: s,
              label: ORDER_STATUS_LABELS[s],
            }))]).map((chip) => {
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
          <Text className="mt-2 text-xs text-stone-500">
            {filtered.length} kayıt gösteriliyor
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text className="mt-10 text-center text-sm text-stone-500">
          Bu filtrede sipariş yok.
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          className="mb-3 rounded-3xl border border-stone-200 bg-white p-4"
          onLongPress={() => intervene(item)}
          onPress={() => intervene(item)}
        >
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
            {new Date(item.created_at).toLocaleString('tr-TR')} · dokun: müdahale
          </Text>
        </Pressable>
      )}
    />
  );
}

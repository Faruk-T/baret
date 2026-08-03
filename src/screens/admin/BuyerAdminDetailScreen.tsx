import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ORDER_STATUS_LABELS } from '../../constants/enums';
import { listBuyersAdmin } from '../../services/adminPeople';
import { supabase } from '../../services/supabase';
import type { OrderStatus } from '../../types/database';
import type { AdminStackParamList } from '../../types/navigation.types';
import { ui } from '../../theme/ui';

type Props = NativeStackScreenProps<AdminStackParamList, 'BuyerAdminDetail'>;

type BuyerOrder = {
  id: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  products: { name: string } | null;
  stores: { name: string } | null;
};

function money(value: number): string {
  return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

export function BuyerAdminDetailScreen({ route }: Props) {
  const { userId } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buyer, setBuyer] = useState<
    Awaited<ReturnType<typeof listBuyersAdmin>>[number] | null
  >(null);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);

  const load = useCallback(async () => {
    try {
      const [all, ordersRes] = await Promise.all([
        listBuyersAdmin(),
        supabase
          .from('orders')
          .select(
            `
            id, status, total_amount, created_at,
            products ( name ),
            stores ( name )
          `
          )
          .eq('buyer_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      setBuyer(all.find((b) => b.id === userId) ?? null);
      if (ordersRes.error) throw ordersRes.error;
      setOrders((ordersRes.data as unknown as BuyerOrder[]) ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

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

  if (!buyer) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <Text className="text-stone-500">Alıcı bulunamadı.</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-[#FFF8F3]"
      data={orders}
      keyExtractor={(item) => item.id}
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
      ListHeaderComponent={
        <View className="mb-4">
          <Text className="text-2xl font-bold text-stone-900">
            {buyer.full_name || 'İsimsiz alıcı'}
          </Text>
          <Text className="mt-1 text-sm text-stone-500">{buyer.email}</Text>
          {buyer.phone ? (
            <Text className="mt-1 text-sm text-stone-500">{buyer.phone}</Text>
          ) : null}

          <View className="mt-4 flex-row gap-2">
            <View className="flex-1 rounded-2xl border border-stone-200 bg-white p-3">
              <Text className="text-xl font-bold text-brand">{buyer.orderCount}</Text>
              <Text className="text-xs text-stone-500">Sipariş</Text>
            </View>
            <View className="flex-1 rounded-2xl border border-stone-200 bg-white p-3">
              <Text className="text-xl font-bold text-green-700">
                {buyer.deliveredCount}
              </Text>
              <Text className="text-xs text-stone-500">Teslim</Text>
            </View>
            <View className="flex-1 rounded-2xl border border-stone-200 bg-white p-3">
              <Text className="text-xl font-bold text-stone-900">
                {money(buyer.spendTotal)}
              </Text>
              <Text className="text-xs text-stone-500">Harcama</Text>
            </View>
          </View>

          <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-stone-500">
            Siparişler
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text className="mt-6 text-center text-sm text-stone-500">
          Bu alıcının siparişi yok.
        </Text>
      }
      renderItem={({ item }) => (
        <View className="mb-2 rounded-2xl border border-stone-200 bg-white px-3 py-3">
          <Text className="font-semibold text-stone-900">
            {item.products?.name ?? 'Ürün'}
          </Text>
          <Text className="mt-1 text-xs text-stone-500">
            {item.stores?.name ?? 'Mağaza'} ·{' '}
            {new Date(item.created_at).toLocaleString('tr-TR')}
          </Text>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-brand">
              {money(Number(item.total_amount))}
            </Text>
            <Text className="text-xs font-semibold text-stone-600">
              {ORDER_STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

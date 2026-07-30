import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { DELIVERY_OPTION_LABELS, ORDER_STATUS_LABELS } from '../../constants/enums';
import { OrderStatusChip } from '../../components/ui/OrderStatusChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { UiCard } from '../../components/ui/UiCard';
import { useAuth } from '../../context/AuthContext';
import { getMyStore } from '../../services/stores';
import {
  listStoreOrders,
  updateSellerOrderStatus,
  type OrderWithProduct,
} from '../../services/orders';
import type { OrderStatus } from '../../types/database';
import { ui } from '../../theme/ui';

const SELLER_NEXT: Partial<
  Record<OrderStatus, Exclude<OrderStatus, 'cancelled'>>
> = {
  pending: 'preparing',
  preparing: 'shipped',
  shipped: 'delivered',
};

export function SellerOrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storeName, setStoreName] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      const store = await getMyStore(user.id);
      if (!store) {
        setStoreName(null);
        setOrders([]);
        return;
      }
      setStoreName(store.name);
      const data = await listStoreOrders(store.id);
      setOrders(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Siparişler yüklenemedi.';
      Alert.alert('Hata', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const advance = (order: OrderWithProduct) => {
    const next = SELLER_NEXT[order.status];
    if (!next) return;
    Alert.alert(
      'Durum güncelle',
      `Sipariş “${ORDER_STATUS_LABELS[next]}” olsun mu?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Güncelle',
          onPress: () => {
            void (async () => {
              try {
                await updateSellerOrderStatus(order.id, next);
                await load();
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : 'Güncellenemedi.';
                Alert.alert('Hata', message);
              }
            })();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator color={ui.brand} />
      </View>
    );
  }

  if (!storeName) {
    return (
      <View className="flex-1 bg-[#FFF8F3]">
        <EmptyState
          icon="storefront-outline"
          title="Mağaza gerekli"
          description="Önce Mağaza sekmesinden mağaza profili oluştur."
        />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View className="flex-1 bg-[#FFF8F3]">
        <EmptyState
          icon="receipt-outline"
          title="Gelen sipariş yok"
          description="Alıcılar checkout yapınca yeni siparişler burada bildirim rozetiyle görünür."
        />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-[#FFF8F3]"
      data={orders}
      keyExtractor={(item) => item.id}
      contentContainerClassName="px-4 py-3"
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
            {storeName} · {orders.length} sipariş
          </Text>
          {orders.some((o) => o.status === 'pending') ? (
            <Text className="mt-1 text-xs font-bold text-brand">
              {orders.filter((o) => o.status === 'pending').length} bekleyen sipariş var
            </Text>
          ) : null}
          <Text className="mt-2 text-xs leading-4 text-stone-500">
            Siparişi “Hazırlanıyor” yaptığında alıcıya telefon/adres açılır. WhatsApp
            ile dışarıda anlaşma platform kurallarına aykırıdır.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const next = SELLER_NEXT[item.status];
        return (
          <UiCard className="mb-3">
            <View className="mb-2 flex-row">
              {item.products?.image_url ? (
                <Image
                  source={{ uri: item.products.image_url }}
                  className="mr-3 h-14 w-14 rounded-xl bg-stone-200"
                />
              ) : (
                <View className="mr-3 h-14 w-14 items-center justify-center rounded-xl bg-orange-50">
                  <Text className="text-xs text-brand">Yok</Text>
                </View>
              )}
              <View className="flex-1">
                <View className="mb-1 flex-row items-start justify-between">
                  <Text className="flex-1 pr-2 font-bold text-stone-900" numberOfLines={2}>
                    {item.products?.name ?? 'Ürün'}
                  </Text>
                  <OrderStatusChip status={item.status} />
                </View>
                <Text className="text-sm font-bold text-brand">
                  ₺{Number(item.total_amount).toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  · {item.quantity} adet
                </Text>
                {item.order_commissions ? (
                  <Text className="mt-1 text-xs text-stone-500">
                    Komisyon %{Number(item.order_commissions.commission_rate)} · −₺
                    {Number(item.order_commissions.commission_amount).toLocaleString(
                      'tr-TR',
                      { minimumFractionDigits: 2 }
                    )}{' '}
                    · Net ₺
                    {Number(item.order_commissions.seller_net_amount).toLocaleString(
                      'tr-TR',
                      { minimumFractionDigits: 2 }
                    )}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text className="text-xs text-stone-500">
              {DELIVERY_OPTION_LABELS[item.delivery_option]}
            </Text>
            {item.delivery_address ? (
              <Text className="mt-1 text-xs text-stone-500" numberOfLines={3}>
                {item.delivery_address}
              </Text>
            ) : null}
            <Text className="mt-1 text-xs text-stone-400">
              {new Date(item.created_at).toLocaleString('tr-TR')}
            </Text>
            {next ? (
              <Pressable
                className="mt-3 self-start rounded-xl bg-brand px-4 py-2.5"
                onPress={() => advance(item)}
              >
                <Text className="font-bold text-white">
                  → {ORDER_STATUS_LABELS[next]}
                </Text>
              </Pressable>
            ) : null}
          </UiCard>
        );
      }}
    />
  );
}

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
import { useAuth } from '../../context/AuthContext';
import { getMyStore } from '../../services/stores';
import {
  listStoreOrders,
  updateSellerOrderStatus,
  type OrderWithProduct,
} from '../../services/orders';
import type { OrderStatus } from '../../types/database';

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
      <View className="flex-1 items-center justify-center bg-stone-50">
        <ActivityIndicator color="#FF6B00" />
      </View>
    );
  }

  if (!storeName) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 px-6">
        <Text className="text-center text-stone-600">
          Önce Mağaza sekmesinden mağaza profili oluştur.
        </Text>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 px-6">
        <Text className="mb-2 text-lg font-semibold text-stone-900">Gelen sipariş yok</Text>
        <Text className="text-center text-sm text-stone-500">
          Alıcılar checkout yapınca siparişler burada görünür.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-stone-50"
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
          tintColor="#FF6B00"
        />
      }
      ListHeaderComponent={
        <Text className="mb-3 text-sm text-stone-500">{storeName} · {orders.length} sipariş</Text>
      }
      renderItem={({ item }) => {
        const next = SELLER_NEXT[item.status];
        return (
          <View className="mb-3 rounded-2xl border border-stone-200 bg-white p-4">
            <View className="mb-2 flex-row">
              {item.products?.image_url ? (
                <Image
                  source={{ uri: item.products.image_url }}
                  className="mr-3 h-14 w-14 rounded-xl bg-stone-200"
                />
              ) : (
                <View className="mr-3 h-14 w-14 items-center justify-center rounded-xl bg-stone-200">
                  <Text className="text-xs text-stone-500">Yok</Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="font-semibold text-stone-900" numberOfLines={2}>
                  {item.products?.name ?? 'Ürün'}
                </Text>
                <Text className="text-sm text-brand">
                  ₺{Number(item.total_amount).toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  · {item.quantity} adet
                </Text>
                <Text className="mt-1 text-sm text-stone-600">
                  {ORDER_STATUS_LABELS[item.status]}
                </Text>
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
                className="mt-3 self-start rounded-xl bg-brand px-4 py-2"
                onPress={() => advance(item)}
              >
                <Text className="font-semibold text-white">
                  → {ORDER_STATUS_LABELS[next]}
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      }}
    />
  );
}

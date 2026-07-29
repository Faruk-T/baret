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
import {
  cancelBuyerOrder,
  listBuyerOrders,
  type OrderWithProduct,
} from '../../services/orders';

export function OrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      const data = await listBuyerOrders(user.id);
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

  const onCancel = (order: OrderWithProduct) => {
    if (order.status !== 'pending') return;
    Alert.alert('Siparişi iptal et', 'Bu sipariş iptal edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              if (!user) return;
              await cancelBuyerOrder(order.id, user.id);
              await load();
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'İptal edilemedi.';
              Alert.alert('Hata', message);
            }
          })();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50">
        <ActivityIndicator color="#FF6B00" />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 px-6">
        <Text className="mb-2 text-lg font-semibold text-stone-900">Henüz sipariş yok</Text>
        <Text className="text-center text-sm text-stone-500">
          Sepetten checkout yapınca siparişlerin burada listelenir.
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
      renderItem={({ item }) => (
        <View className="mb-3 rounded-2xl border border-stone-200 bg-white p-4">
          <View className="mb-2 flex-row items-start">
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
              <Text className="text-base font-semibold text-stone-900" numberOfLines={2}>
                {item.products?.name ?? 'Ürün'}
              </Text>
              <Text className="text-sm text-stone-500">
                {item.stores?.name ?? 'Mağaza'} · {ORDER_STATUS_LABELS[item.status]}
              </Text>
              <Text className="mt-1 text-sm font-medium text-brand">
                ₺{Number(item.total_amount).toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                })}{' '}
                · {item.quantity} adet
              </Text>
            </View>
          </View>
          <Text className="mb-1 text-xs text-stone-500">
            {DELIVERY_OPTION_LABELS[item.delivery_option]}
          </Text>
          {item.delivery_address ? (
            <Text className="mb-2 text-xs text-stone-500" numberOfLines={2}>
              {item.delivery_address}
            </Text>
          ) : null}
          <Text className="text-xs text-stone-400">
            {new Date(item.created_at).toLocaleString('tr-TR')}
          </Text>
          {item.status === 'pending' ? (
            <Pressable className="mt-3 self-start" onPress={() => onCancel(item)}>
              <Text className="text-sm font-medium text-red-600">İptal et</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    />
  );
}

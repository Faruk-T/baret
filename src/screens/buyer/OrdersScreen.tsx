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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { OrderReviewBlock } from '../../components/buyer/OrderReviewBlock';
import { EmptyState } from '../../components/ui/EmptyState';
import { OrderStatusChip } from '../../components/ui/OrderStatusChip';
import { UiCard } from '../../components/ui/UiCard';
import { DELIVERY_OPTION_LABELS } from '../../constants/enums';
import { useAuth } from '../../context/AuthContext';
import {
  cancelBuyerOrder,
  listBuyerOrders,
  type OrderWithProduct,
} from '../../services/orders';
import { listReviewsForOrders } from '../../services/reviews';
import type { Review } from '../../types/database';
import type { BuyerTabParamList } from '../../types/navigation.types';
import { ui } from '../../theme/ui';

export function OrdersScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<BuyerTabParamList>>();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithProduct[]>([]);
  const [reviewsByOrder, setReviewsByOrder] = useState<Record<string, Review>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setReviewsByOrder({});
      setLoading(false);
      return;
    }
    try {
      const data = await listBuyerOrders(user.id);
      setOrders(data);
      const deliveredIds = data.filter((o) => o.status === 'delivered').map((o) => o.id);
      const map = await listReviewsForOrders(deliveredIds, user.id);
      setReviewsByOrder(map);
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
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator color={ui.brand} />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View className="flex-1 bg-[#FFF8F3]">
        <EmptyState
          icon="receipt-outline"
          title="Henüz sipariş yok"
          description="Sepetten checkout yapınca siparişlerin burada renkli durum etiketleriyle listelenir."
          actionLabel="Alışverişe git"
          onAction={() => navigation.navigate('Home')}
        />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-[#FFF8F3]"
      data={orders}
      keyExtractor={(item) => item.id}
      contentContainerClassName="px-4 py-4"
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
      renderItem={({ item }) => (
        <UiCard className="mb-3" padded={false}>
          <View className="p-4">
            <View className="mb-3 flex-row items-start">
              {item.products?.image_url ? (
                <Image
                  source={{ uri: item.products.image_url }}
                  className="mr-3 h-16 w-16 rounded-xl bg-stone-100"
                />
              ) : (
                <View className="mr-3 h-16 w-16 items-center justify-center rounded-xl bg-orange-50">
                  <Text className="text-xs text-brand">Görsel</Text>
                </View>
              )}
              <View className="flex-1">
                <View className="mb-1 flex-row items-start justify-between gap-2">
                  <Text
                    className="flex-1 text-base font-bold text-stone-900"
                    numberOfLines={2}
                  >
                    {item.products?.name ?? 'Ürün'}
                  </Text>
                  <OrderStatusChip status={item.status} />
                </View>
                <Text className="text-sm text-stone-500">
                  {item.stores?.name ?? 'Mağaza'}
                </Text>
                <Text className="mt-1 text-base font-bold text-brand">
                  ₺
                  {Number(item.total_amount).toLocaleString('tr-TR', {
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
                <Text className="text-sm font-bold text-red-600">İptal et</Text>
              </Pressable>
            ) : null}
            {item.status === 'delivered' && user ? (
              <OrderReviewBlock
                buyerId={user.id}
                storeId={item.store_id}
                orderId={item.id}
                existing={reviewsByOrder[item.id] ?? null}
                onSaved={() => void load()}
              />
            ) : null}
          </View>
        </UiCard>
      )}
    />
  );
}

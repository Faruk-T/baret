import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { DELIVERY_OPTION_LABELS, ORDER_STATUS_LABELS } from '../../constants/enums';
import { OrderStatusChip } from '../../components/ui/OrderStatusChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { UiCard } from '../../components/ui/UiCard';
import { useAuth } from '../../context/AuthContext';
import { notifyBuyerOrderStatus } from '../../services/adminOps';
import { getMyStore } from '../../services/stores';
import {
  cancelSellerOrder,
  confirmOrderPickup,
  listStoreOrders,
  updateSellerOrderStatus,
  type OrderWithProduct,
} from '../../services/orders';
import type { OrderStatus } from '../../types/database';
import { ui } from '../../theme/ui';

/** shipped → delivered only via pickup code verify */
const SELLER_NEXT: Partial<
  Record<OrderStatus, Exclude<OrderStatus, 'cancelled' | 'delivered'>>
> = {
  pending: 'preparing',
  preparing: 'shipped',
};

function nextStatusLabel(
  order: OrderWithProduct,
  next: Exclude<OrderStatus, 'cancelled' | 'delivered'>
): string {
  if (next === 'shipped' && order.delivery_option === 'gel_al') {
    return 'Mağazada hazır (teslim kodu oluşur)';
  }
  if (next === 'shipped') {
    return 'Yola çıktı / hazır (teslim kodu oluşur)';
  }
  return ORDER_STATUS_LABELS[next];
}

export function SellerOrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [pickupInput, setPickupInput] = useState('');
  const [verifying, setVerifying] = useState(false);

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

  const runAdvance = async (order: OrderWithProduct, next: NonNullable<typeof SELLER_NEXT[keyof typeof SELLER_NEXT]>) => {
    try {
      const updated = await updateSellerOrderStatus(order.id, next);
      if (user?.id) {
        await notifyBuyerOrderStatus(
          { buyer_id: updated.buyer_id, id: updated.id, status: updated.status },
          user.id
        );
      }
      await load();
      if (next === 'shipped') {
        Alert.alert(
          'Teslime hazır',
          'Alıcı kendi uygulamasında 6 haneli teslim kodunu görecek. Kod sana görünmez — mağazaya gelince kodu buraya girerek doğrularsın.'
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Güncellenemedi.';
      Alert.alert('Hata', message);
    }
  };

  const advance = (order: OrderWithProduct) => {
    const next = SELLER_NEXT[order.status];
    if (!next) return;
    // Pending → preparing: one tap, no confirm dialog
    if (order.status === 'pending' && next === 'preparing') {
      void runAdvance(order, next);
      return;
    }
    Alert.alert('Durum güncelle', `Sipariş “${nextStatusLabel(order, next)}” olsun mu?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Güncelle',
        onPress: () => {
          void runAdvance(order, next);
        },
      },
    ]);
  };

  const rejectOrder = (order: OrderWithProduct) => {
    if (order.status !== 'pending' && order.status !== 'preparing') return;
    Alert.alert(
      'Siparişi reddet',
      'Sipariş iptal edilir, stok geri eklenir. Alıcıya bildirim gider.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const updated = await cancelSellerOrder(order.id);
                if (user?.id) {
                  await notifyBuyerOrderStatus(
                    {
                      buyer_id: updated.buyer_id,
                      id: updated.id,
                      status: 'cancelled',
                    },
                    user.id
                  );
                }
                await load();
              } catch (error) {
                Alert.alert(
                  'Hata',
                  error instanceof Error ? error.message : 'Reddedilemedi.'
                );
              }
            })();
          },
        },
      ]
    );
  };

  const verifyPickup = async () => {
    const code = pickupInput.trim();
    if (code.length < 4) {
      Alert.alert('Kod', 'Alıcının gösterdiği 6 haneli teslim kodunu gir.');
      return;
    }
    try {
      setVerifying(true);
      const order = await confirmOrderPickup(code);
      if (user?.id) {
        await notifyBuyerOrderStatus(
          { buyer_id: order.buyer_id, id: order.id, status: 'delivered' },
          user.id
        );
      }
      setPickupInput('');
      await load();
      Alert.alert(
        'Teslim alındı',
        `Sipariş teslim edildi olarak işaretlendi.\nTutar: ₺${Number(order.total_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
      );
    } catch (error) {
      Alert.alert(
        'Doğrulama',
        error instanceof Error
          ? error.message
          : 'Kod geçersiz. pickup-code SQL kuruldu mu?'
      );
    } finally {
      setVerifying(false);
    }
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

  const readyCount = orders.filter((o) => o.status === 'shipped').length;

  return (
    <FlatList
      className="flex-1 bg-[#FFF8F3]"
      data={orders}
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
          <Text className="text-sm text-stone-500">
            {storeName} · {orders.length} sipariş
          </Text>
          {orders.some((o) => o.status === 'pending') ? (
            <Text className="mt-1 text-xs font-bold text-brand">
              {orders.filter((o) => o.status === 'pending').length} bekleyen sipariş var
            </Text>
          ) : null}

          <View className="mt-3 rounded-2xl border border-brand bg-orange-50 p-4">
            <Text className="mb-1 text-sm font-bold text-brand">
              Teslim kodu doğrula
            </Text>
            <Text className="mb-3 text-xs leading-4 text-stone-600">
              Alıcı mağazaya geldiğinde uygulamadaki 6 haneli kodu söyleyecek / gösterecek.
              {readyCount > 0 ? ` Şu an ${readyCount} sipariş kod bekliyor.` : ''}
            </Text>
            <TextInput
              className="mb-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-center font-mono text-xl font-bold tracking-[4px] text-stone-900"
              placeholder="ABC123"
              placeholderTextColor="#a8a29e"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              value={pickupInput}
              onChangeText={setPickupInput}
            />
            <Pressable
              className={`items-center rounded-xl bg-brand py-3 ${
                verifying ? 'opacity-70' : ''
              }`}
              disabled={verifying}
              onPress={() => void verifyPickup()}
            >
              {verifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-bold text-white">Kodu okut / teslim et</Text>
              )}
            </Pressable>
          </View>

          <Text className="mt-3 text-xs leading-4 text-stone-500">
            “Hazırlanıyor” → iletişim açılır. “Hazır” → teslim kodu oluşur. WhatsApp ile
            dışarıda anlaşma yasaktır.
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
                  ₺
                  {Number(item.total_amount).toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  · {item.quantity} adet
                </Text>
                {item.order_commissions &&
                Number(item.order_commissions.commission_amount) > 0 ? (
                  <View className="mt-2 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-2">
                    <Text className="text-[11px] font-bold uppercase text-stone-500">
                      Eski komisyon kaydı
                    </Text>
                    <Text className="mt-0.5 text-xs text-stone-700">
                      Platform −₺
                      {Number(item.order_commissions.commission_amount).toLocaleString(
                        'tr-TR',
                        { minimumFractionDigits: 2 }
                      )}{' '}
                      (%{Number(item.order_commissions.commission_rate)})
                    </Text>
                    <Text className="text-xs font-bold text-green-700">
                      Senin net ₺
                      {Number(item.order_commissions.seller_net_amount).toLocaleString(
                        'tr-TR',
                        { minimumFractionDigits: 2 }
                      )}
                    </Text>
                  </View>
                ) : (
                  <Text className="mt-1 text-xs text-green-700">
                    Sipariş tutarının tamamı sana ait · abonelik modeli
                  </Text>
                )}
              </View>
            </View>
            <Text className="mt-1 text-xs text-amber-800">
              Stok sipariş anında {item.quantity} adet düşürüldü.
            </Text>
            <Text className="mt-1 text-xs text-stone-500">
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

            {item.status === 'shipped' ? (
              <View className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                <Text className="text-xs font-bold text-green-800">
                  Alıcıdaki teslim kodunu yukarıya gir → sipariş tamamlanır
                </Text>
              </View>
            ) : null}

            <View className="mt-3 flex-row flex-wrap gap-2">
              {next ? (
                <Pressable
                  className="rounded-xl bg-brand px-4 py-2.5"
                  onPress={() => advance(item)}
                >
                  <Text className="font-bold text-white">
                    → {nextStatusLabel(item, next)}
                  </Text>
                </Pressable>
              ) : null}
              {item.status === 'pending' || item.status === 'preparing' ? (
                <Pressable
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5"
                  onPress={() => rejectOrder(item)}
                >
                  <Text className="font-bold text-red-600">Reddet</Text>
                </Pressable>
              ) : null}
            </View>
          </UiCard>
        );
      }}
    />
  );
}

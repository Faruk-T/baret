import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { DELIVERY_OPTION_LABELS, ORDER_STATUS_LABELS } from '../../constants/enums';
import { OrderStatusChip } from '../../components/ui/OrderStatusChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { UiCard } from '../../components/ui/UiCard';
import { useAuth } from '../../context/AuthContext';
import { getMyStore } from '../../services/stores';
import {
  cancelSellerOrder,
  confirmOrderPickup,
  listStoreOrders,
  updateSellerOrderStatus,
  type OrderWithProduct,
} from '../../services/orders';
import type { OrderStatus } from '../../types/database';
import { exportCsvFile, toCsv } from '../../utils/csv';
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

  // Note: notifyBuyerOrderStatus is already triggered inside updateSellerOrderStatus,
  // cancelSellerOrder, and confirmOrderPickup in src/services/orders.ts.
  const runAdvance = async (
    order: OrderWithProduct,
    next: NonNullable<typeof SELLER_NEXT[keyof typeof SELLER_NEXT]>
  ) => {
    try {
      await updateSellerOrderStatus(order.id, next);
      await load();
      if (next === 'shipped') {
        Alert.alert(
          'Teslime hazır',
          'Alıcı kendi uygulamasında 6 haneli teslim kodunu görecek. Kod sana görünmez — teslim anında kodu buraya girerek doğrularsın.'
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
                await cancelSellerOrder(order.id);
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
          : 'Kod geçersiz.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleExportOrdersCsv = async () => {
    const csv = toCsv(
      ['Sipariş No', 'Tarih', 'Ürün', 'Miktar', 'Toplam (TL)', 'Durum', 'Teslimat', 'Adres', 'Not'],
      orders.map((o) => [
        o.id,
        o.created_at,
        o.products?.name ?? '',
        o.quantity,
        o.total_amount,
        ORDER_STATUS_LABELS[o.status],
        DELIVERY_OPTION_LABELS[o.delivery_option],
        o.delivery_address ?? '',
        o.notes ?? '',
      ])
    );
    await exportCsvFile('baret-satici-siparisler.csv', csv, 'Baret Satıcı Sipariş Raporu');
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
        <View style={{ maxWidth: 1080, width: '100%', alignSelf: 'center' }} className="mb-3">
          <View className="flex-row items-center justify-between flex-wrap gap-2">
            <View>
              <Text className="text-sm font-bold text-stone-700">
                {storeName} · {orders.length} sipariş
              </Text>
              {orders.some((o) => o.status === 'pending') ? (
                <Text className="mt-0.5 text-xs font-bold text-brand">
                  {orders.filter((o) => o.status === 'pending').length} bekleyen sipariş var
                </Text>
              ) : null}
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => void handleExportOrdersCsv()}
                className="flex-row items-center rounded-xl border border-stone-200 bg-white px-3 py-2"
              >
                <Feather name="download" size={14} color="#1C1917" />
                <Text className="ml-1.5 text-xs font-bold text-stone-800">
                  CSV İndir
                </Text>
              </Pressable>
              {Platform.OS === 'web' ? (
                <Pressable
                  onPress={() => {
                    if (typeof window !== 'undefined' && window.print) {
                      window.print();
                    }
                  }}
                  className="flex-row items-center rounded-xl border border-stone-200 bg-white px-3 py-2"
                >
                  <Feather name="printer" size={14} color="#1C1917" />
                  <Text className="ml-1.5 text-xs font-bold text-stone-800">
                    Sevk Fişi Yazdır
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View className="mt-3 rounded-2xl border border-brand bg-orange-50 p-4">
            <Text className="mb-1 text-sm font-bold text-brand">
              Teslim kodu doğrula (6 Haneli PIN)
            </Text>
            <Text className="mb-3 text-xs leading-4 text-stone-600">
              Alıcı mağazaya geldiğinde veya şantiyede teslim alırken uygulamadaki 6 haneli kodu söyleyecek / gösterecek.
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
                <Text className="font-bold text-white">Kodu doğrula ve teslim et</Text>
              )}
            </Pressable>
          </View>
        </View>
      }
      renderItem={({ item }) => {
        const next = SELLER_NEXT[item.status];
        return (
          <View style={{ maxWidth: 1080, width: '100%', alignSelf: 'center' }}>
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
                    · {item.quantity} birim
                  </Text>
                  <Text className="mt-1 text-xs font-semibold text-emerald-700">
                    %0 Komisyon — Sipariş tutarının tamamı mağazanıza aittir
                  </Text>
                </View>
              </View>
              <Text className="mt-1 text-xs text-stone-500">
                {DELIVERY_OPTION_LABELS[item.delivery_option]}
              </Text>
              {item.delivery_address ? (
                <Text className="mt-1 text-xs text-stone-600" numberOfLines={3}>
                  📍 {item.delivery_address}
                </Text>
              ) : null}
              {item.notes ? (
                <Text className="mt-1 text-xs text-stone-700 font-medium">
                  📋 {item.notes}
                </Text>
              ) : null}
              <Text className="mt-1 text-xs text-stone-400">
                Sipariş No: #{item.id.slice(0, 8).toUpperCase()} ·{' '}
                {new Date(item.created_at).toLocaleString('tr-TR')}
              </Text>

              {item.status === 'shipped' ? (
                <View className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                  <Text className="text-xs font-bold text-green-800">
                    Alıcıdaki 6 haneli teslim kodunu yukarıya gir → sipariş tamamlanır
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
          </View>
        );
      }}
    />
  );
}

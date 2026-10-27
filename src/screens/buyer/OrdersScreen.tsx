import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import { OrderProgressStepper } from '../../components/buyer/OrderProgressStepper';
import { OrderReviewBlock } from '../../components/buyer/OrderReviewBlock';
import { OrderStoreContactCard } from '../../components/buyer/OrderStoreContactCard';
import { WebPortalFooter } from '../../components/layout/WebPortalFooter';
import { WebPortalHeader } from '../../components/layout/WebPortalHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { OrderStatusChip } from '../../components/ui/OrderStatusChip';
import { UiCard } from '../../components/ui/UiCard';
import {
  DELIVERY_OPTION_LABELS,
  ORDER_STATUS_HINTS,
} from '../../constants/enums';
import { useAuth } from '../../context/AuthContext';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import {
  cancelBuyerOrder,
  listBuyerOrders,
  type OrderWithProduct,
} from '../../services/orders';
import {
  REPORT_REASONS,
  createPlatformReport,
} from '../../services/reports';
import { listReviewsForOrders } from '../../services/reviews';
import type { Review } from '../../types/database';
import type { BuyerTabParamList } from '../../types/navigation.types';
import { canRevealStoreContact } from '../../utils/contactFilter';
import { usePageSeo } from '../../utils/seo';
import { ui } from '../../theme/ui';

export function OrdersScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<BuyerTabParamList>>();
  const { user, session } = useAuth();
  const { isDesktop } = useResponsiveLayout();
  const [orders, setOrders] = useState<OrderWithProduct[]>([]);
  const [reviewsByOrder, setReviewsByOrder] = useState<Record<string, Review>>({});
  const [tab, setTab] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  usePageSeo({
    title: 'Siparişlerim & İrsaliye Takibi | Baret Yapı Tedarik',
    description:
      'Şantiye siparişlerinizi, güvenli teslimat PIN kodlarınızı ve irsaliye özetlerinizi takip edin.',
    canonicalPath: '/orders',
  });

  const activeOrders = useMemo(
    () => orders.filter((o) => ['pending', 'preparing', 'shipped'].includes(o.status)),
    [orders]
  );
  const deliveredOrders = useMemo(
    () => orders.filter((o) => o.status === 'delivered'),
    [orders]
  );
  const cancelledOrders = useMemo(
    () => orders.filter((o) => o.status === 'cancelled'),
    [orders]
  );

  const displayedOrders = useMemo(() => {
    if (tab === 'active') return activeOrders;
    if (tab === 'delivered') return deliveredOrders;
    if (tab === 'cancelled') return cancelledOrders;
    return orders;
  }, [tab, orders, activeOrders, deliveredOrders, cancelledOrders]);

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

  const onReport = (order: OrderWithProduct) => {
    if (!user) return;

    Alert.alert(
      'Şikayet et',
      'Neden bildiriyorsun? Platform dışı telefon / WhatsApp teklifleri kullanım kurallarına aykırıdır.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Telefon/WhatsApp paylaşımı',
          onPress: () => void submitReport(order, REPORT_REASONS[0], null),
        },
        {
          text: 'Dışarıda anlaşma teklifi',
          onPress: () => void submitReport(order, REPORT_REASONS[1], null),
        },
        {
          text: 'Diğer',
          onPress: () => void submitReport(order, REPORT_REASONS[3], null),
        },
      ]
    );
  };

  const submitReport = async (
    order: OrderWithProduct,
    reason: string,
    details: string | null
  ) => {
    if (!user) return;
    try {
      await createPlatformReport({
        reporterId: user.id,
        storeId: order.store_id,
        orderId: order.id,
        reason,
        details,
      });
      Alert.alert('Alındı', 'Şikayetin admin paneline iletildi. Teşekkürler.');
    } catch (error) {
      Alert.alert(
        'Hata',
        error instanceof Error
          ? error.message
          : 'Şikayet gönderilemedi.'
      );
    }
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    const parent = navigation.getParent() as any;
    if (mode === 'register') {
      parent?.navigate('Auth', { screen: 'RoleSelect' });
    } else {
      parent?.navigate('Auth');
    }
  };

  const handleNavigatePortalTab = (
    targetTab: 'catalog' | 'quick_order' | 'rfq' | 'orders' | 'profile'
  ) => {
    if (targetTab === 'catalog' || targetTab === 'quick_order') {
      navigation.navigate('Home');
    } else if (targetTab === 'rfq') {
      navigation.navigate('Rfq');
    } else if (targetTab === 'profile') {
      navigation.navigate('Profile');
    }
  };

  const desktopHeader = isDesktop ? (
    <WebPortalHeader
      activeTab="orders"
      onSelectTab={handleNavigatePortalTab}
      onOpenCart={() => navigation.navigate('Cart')}
      onOpenAuth={openAuthModal}
    />
  ) : null;

  if (!session || !user) {
    return (
      <View className="flex-1 bg-zinc-50">
        {desktopHeader}
        <ScrollView contentContainerClassName="flex-grow justify-between">
          <View className="py-12">
            <EmptyState
              icon="receipt-outline"
              title="Siparişlerinizi görmek için giriş yapın"
              description="Şantiye siparişlerinizi, teslimat kodlarınızı ve irsaliye özetlerinizi takip etmek için hesabınıza giriş yapın."
              actionLabel="Giriş Yap / Kayıt Ol"
              onAction={() => openAuthModal('login')}
            />
          </View>
          {isDesktop ? (
            <WebPortalFooter
              onNavigateTab={handleNavigatePortalTab}
              onOpenAuth={openAuthModal}
            />
          ) : null}
        </ScrollView>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-zinc-50">
        {desktopHeader}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={ui.brand} />
        </View>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View className="flex-1 bg-zinc-50">
        {desktopHeader}
        <ScrollView contentContainerClassName="flex-grow justify-between">
          <View className="py-12">
            <EmptyState
              icon="receipt-outline"
              title="Henüz sipariş yok"
              description="Sepetten sipariş oluşturduğunuzda tüm teslimat ve irsaliye adımları burada listelenir."
              actionLabel="Kataloğa Git"
              onAction={() => navigation.navigate('Home')}
            />
          </View>
          {isDesktop ? (
            <WebPortalFooter
              onNavigateTab={handleNavigatePortalTab}
              onOpenAuth={openAuthModal}
            />
          ) : null}
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-50">
      {desktopHeader}
      <FlatList
        className="flex-1"
        data={displayedOrders}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 py-6"
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
          <View
            style={{ maxWidth: 960, width: '100%', alignSelf: 'center' }}
            className="mb-4"
          >
            <View className="mb-4">
              <Text className="text-xl font-bold text-zinc-900">
                Siparişlerim & İrsaliye Takibi
              </Text>
              <Text className="text-xs text-zinc-500 mt-0.5">
                Şantiye sevkiyat durumlarını ve güvenli teslimat PIN kodlarınızı buradan yönetebilirsiniz
              </Text>
            </View>

            <View className="flex-row items-center justify-between flex-wrap gap-2">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                <Pressable
                  className={`mr-2 rounded-lg px-3.5 py-2 border ${
                    tab === 'all' ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-200 bg-white'
                  }`}
                  onPress={() => setTab('all')}
                >
                  <Text className={`text-xs font-semibold ${tab === 'all' ? 'text-white' : 'text-zinc-700'}`}>
                    Tümü ({orders.length})
                  </Text>
                </Pressable>

                <Pressable
                  className={`mr-2 rounded-lg px-3.5 py-2 border ${
                    tab === 'active' ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-200 bg-white'
                  }`}
                  onPress={() => setTab('active')}
                >
                  <Text className={`text-xs font-semibold ${tab === 'active' ? 'text-white' : 'text-zinc-700'}`}>
                    Aktif ({activeOrders.length})
                  </Text>
                </Pressable>

                <Pressable
                  className={`mr-2 rounded-lg px-3.5 py-2 border ${
                    tab === 'delivered' ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-200 bg-white'
                  }`}
                  onPress={() => setTab('delivered')}
                >
                  <Text className={`text-xs font-semibold ${tab === 'delivered' ? 'text-white' : 'text-zinc-700'}`}>
                    Teslim Edilen ({deliveredOrders.length})
                  </Text>
                </Pressable>

                <Pressable
                  className={`mr-2 rounded-lg px-3.5 py-2 border ${
                    tab === 'cancelled' ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-200 bg-white'
                  }`}
                  onPress={() => setTab('cancelled')}
                >
                  <Text className={`text-xs font-semibold ${tab === 'cancelled' ? 'text-white' : 'text-zinc-700'}`}>
                    İptal ({cancelledOrders.length})
                  </Text>
                </Pressable>
              </ScrollView>

              {Platform.OS === 'web' ? (
                <Pressable
                  onPress={() => {
                    if (typeof window !== 'undefined' && window.print) {
                      window.print();
                    }
                  }}
                  className="flex-row items-center rounded-lg border border-zinc-200 bg-white px-3.5 py-2"
                >
                  <Ionicons name="print-outline" size={15} color="#18181B" />
                  <Text className="ml-1.5 text-xs font-semibold text-zinc-800">
                    İrsaliye / Sipariş Özeti Yazdır
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="my-8 items-center justify-center p-4">
            <Ionicons name="receipt-outline" size={40} color="#D4D4D8" />
            <Text className="mt-2 text-sm font-semibold text-zinc-700">
              {tab === 'active'
                ? 'Aktif sipariş bulunmuyor.'
                : tab === 'delivered'
                ? 'Henüz teslim edilmiş siparişiniz yok.'
                : tab === 'cancelled'
                ? 'İptal edilmiş siparişiniz yok.'
                : 'Henüz sipariş bulunmuyor.'}
            </Text>
          </View>
        }
        ListFooterComponent={
          isDesktop ? (
            <View className="mt-8 -mx-4">
              <WebPortalFooter
                onNavigateTab={handleNavigatePortalTab}
                onOpenAuth={openAuthModal}
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={{ maxWidth: 960, width: '100%', alignSelf: 'center' }}>
            <UiCard className="mb-3" padded={false}>
              <View className="p-4">
                <View className="mb-3 flex-row items-start">
                  {item.products?.image_url ? (
                    <Image
                      source={{ uri: item.products.image_url }}
                      className="mr-3 h-16 w-16 rounded-lg bg-zinc-100"
                    />
                  ) : (
                    <View className="mr-3 h-16 w-16 items-center justify-center rounded-lg bg-zinc-100">
                      <Text className="text-xs text-zinc-500">Görsel</Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <View className="mb-1 flex-row items-start justify-between gap-2">
                      <Text
                        className="flex-1 text-base font-bold text-zinc-900"
                        numberOfLines={2}
                      >
                        {item.products?.name ?? 'Ürün'}
                      </Text>
                      <OrderStatusChip status={item.status} />
                    </View>
                    <Text className="text-sm text-zinc-500">
                      {item.stores?.name ?? 'Mağaza'}
                    </Text>
                    <Text className="mt-1 text-base font-bold text-zinc-900">
                      ₺
                      {Number(item.total_amount).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      · {item.quantity} birim
                    </Text>
                  </View>
                </View>
                <Text className="mb-1 text-xs text-zinc-500">
                  {DELIVERY_OPTION_LABELS[item.delivery_option]}
                </Text>
                {item.delivery_address ? (
                  <Text className="mb-1 text-xs text-zinc-500" numberOfLines={2}>
                    {item.delivery_address}
                  </Text>
                ) : null}
                {item.notes ? (
                  <Text className="mb-2 text-xs text-zinc-600" numberOfLines={2}>
                    {item.notes}
                  </Text>
                ) : null}
                <Text className="text-xs text-zinc-400">
                  Sipariş No: #{item.id.slice(0, 8).toUpperCase()} ·{' '}
                  {new Date(item.created_at).toLocaleString('tr-TR')}
                </Text>

                {/* Visual Order Stepper */}
                <OrderProgressStepper
                  status={item.status}
                  deliveryOption={item.delivery_option}
                />

                <View className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                  <Text className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Şimdi ne olacak?
                  </Text>
                  <Text className="mt-1 text-xs leading-4 text-zinc-600">
                    {ORDER_STATUS_HINTS[item.status]}
                  </Text>
                </View>

                <OrderStoreContactCard
                  orderId={item.id}
                  unlocked={canRevealStoreContact(item.status)}
                />

                {item.status === 'shipped' && item.pickup_code ? (
                  <View className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                    <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-800">
                      Güvenli Teslimat PIN Kodun
                    </Text>
                    <Text className="text-center font-mono text-3xl font-bold tracking-[6px] text-zinc-900">
                      {item.pickup_code}
                    </Text>
                    <Pressable
                      className="mt-3 flex-row items-center justify-center rounded-lg bg-zinc-900 py-2.5"
                      onPress={() => {
                        void Clipboard.setStringAsync(item.pickup_code ?? '').then(() => {
                          Alert.alert('Kopyalandı', 'Teslim kodu panoya alındı.');
                        });
                      }}
                    >
                      <Ionicons name="copy-outline" size={16} color="#fff" />
                      <Text className="ml-1.5 text-sm font-semibold text-white">Kodu kopyala</Text>
                    </Pressable>
                    <Text className="mt-2 text-center text-xs leading-4 text-zinc-600">
                      {item.delivery_option === 'gel_al'
                        ? 'Mağazaya gittiğinde bu kodu satıcıya göster. Okutulunca sipariş teslim edildi olur.'
                        : 'Teslimatta bu kodu söyle / göster. Satıcı doğrulayınca sipariş tamamlanır.'}
                    </Text>
                  </View>
                ) : null}

                <View className="mt-3 flex-row flex-wrap gap-3">
                  {item.status === 'pending' ? (
                    <Pressable onPress={() => onCancel(item)}>
                      <Text className="text-sm font-semibold text-red-600">İptal et</Text>
                    </Pressable>
                  ) : null}
                  {item.status !== 'cancelled' ? (
                    <Pressable onPress={() => onReport(item)}>
                      <Text className="text-sm font-semibold text-zinc-500">Şikayet et</Text>
                    </Pressable>
                  ) : null}
                </View>

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
          </View>
        )}
      />
    </View>
  );
}

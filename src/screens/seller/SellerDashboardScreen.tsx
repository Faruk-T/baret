import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { StarRating } from '../../components/common/StarRating';
import { NotificationsInbox } from '../../components/notifications/NotificationsInbox';
import { MenuTile } from '../../components/ui/MenuTile';
import { UiCard } from '../../components/ui/UiCard';
import { LOW_STOCK_THRESHOLD, isLowStock } from '../../constants/inventory';
import { useAuth } from '../../context/AuthContext';
import { listStoreProducts } from '../../services/products';
import { getMyStore } from '../../services/stores';
import {
  getStoreRatingSummary,
  listStoreReviews,
  type ReviewWithBuyer,
} from '../../services/reviews';
import { countPendingStoreOrders } from '../../services/orders';
import { supabase } from '../../services/supabase';
import type { Product, Store } from '../../types/database';
import type { SellerTabParamList } from '../../types/navigation.types';
import {
  formatLicenseExpiry,
  getLicenseStatus,
  type LicenseStatus,
} from '../../utils/license';
import { ui } from '../../theme/ui';

type TabNav = BottomTabNavigationProp<SellerTabParamList>;

export function SellerDashboardScreen() {
  const navigation = useNavigation<TabNav>();
  const { user } = useAuth();
  const [storeName, setStoreName] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [licenseExpiresAt, setLicenseExpiresAt] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [reviews, setReviews] = useState<ReviewWithBuyer[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const store = await getMyStore(user.id);
      if (!store) {
        setStoreName(null);
        setIsApproved(false);
        setLicenseExpiresAt(null);
        setPendingOrders(0);
        setReviews([]);
        setSummary({ average: 0, count: 0 });
        setLowStock([]);
        return;
      }
      setStoreName(store.name);
      setIsApproved(store.is_approved);
      setLicenseExpiresAt(store.license_expires_at);
      const [rating, rows, products, pending] = await Promise.all([
        getStoreRatingSummary(store.id),
        listStoreReviews(store.id),
        listStoreProducts(store.id),
        countPendingStoreOrders(store.id),
      ]);
      setSummary(rating);
      setReviews(rows);
      setPendingOrders(pending);
      setLowStock(
        products
          .filter((p) => isLowStock(p.stock, p.is_active))
          .sort((a, b) => a.stock - b.stock)
      );
    } catch {
      // keep previous
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
      if (!user?.id) return;

      const channel = supabase
        .channel(`dashboard-store-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'stores',
            filter: `owner_id=eq.${user.id}`,
          },
          (payload) => {
            const next = payload.new as Store;
            setStoreName(next.name);
            setIsApproved(next.is_approved);
            setLicenseExpiresAt(next.license_expires_at);
          }
        )
        .subscribe();

      const poll = setInterval(() => {
        void getMyStore(user.id).then((store) => {
          if (!store) return;
          setIsApproved(store.is_approved);
          setStoreName(store.name);
          setLicenseExpiresAt(store.license_expires_at);
          if (store.is_approved) clearInterval(poll);
        });
      }, 4000);

      return () => {
        clearInterval(poll);
        void supabase.removeChannel(channel);
      };
    }, [load, user?.id])
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator color={ui.brand} />
      </View>
    );
  }

  if (!storeName) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3] px-6">
        <View
          className="mb-4 h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: ui.brandSoft }}
        >
          <Ionicons name="storefront-outline" size={32} color={ui.brand} />
        </View>
        <Text className="mb-2 text-center text-lg font-bold text-stone-900">
          Mağaza henüz yok
        </Text>
        <Text className="mb-5 text-center text-sm text-stone-500">
          Önce Mağaza sekmesinden profil oluştur.
        </Text>
        <Pressable
          className="rounded-2xl bg-brand px-5 py-3"
          onPress={() => navigation.navigate('StoreSettings')}
        >
          <Text className="font-bold text-white">Mağazaya git</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#FFF8F3]"
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
    >
      <Text className="mb-1 text-2xl font-bold text-stone-900">{storeName}</Text>
      <Text className="mb-3 text-sm text-stone-500">
        Mağaza paneli · stok, lisans ve siparişler
      </Text>

      {user?.id ? (
        <UiCard className="mb-4">
          <NotificationsInbox userId={user.id} limit={5} />
        </UiCard>
      ) : null}

      <View
        className={`mb-4 rounded-2xl border px-3 py-3 ${
          isApproved
            ? 'border-green-200 bg-green-50'
            : 'border-amber-200 bg-amber-50'
        }`}
      >
        <Text
          className={`text-sm font-bold ${
            isApproved ? 'text-green-800' : 'text-amber-900'
          }`}
        >
          {isApproved ? 'Mağaza onaylandı' : 'Onay bekleniyor'}
        </Text>
        <Text
          className={`mt-1 text-xs ${
            isApproved ? 'text-green-700' : 'text-amber-800'
          }`}
        >
          {isApproved
            ? 'Ürünlerin alıcı kataloğunda görünür.'
            : 'Admin onaylayınca burada otomatik güncellenir — çıkış yapmana gerek yok.'}
        </Text>
      </View>

      <View className="mb-4 flex-row gap-3">
        <UiCard className="flex-1 items-center py-3">
          <Text className="text-2xl font-bold text-brand">{pendingOrders}</Text>
          <Text className="mt-1 text-center text-xs text-stone-500">Bekleyen</Text>
        </UiCard>
        <UiCard className="flex-1 items-center py-3">
          <Text className="text-2xl font-bold text-stone-900">{summary.average || '—'}</Text>
          <Text className="mt-1 text-center text-xs text-stone-500">Puan</Text>
        </UiCard>
        <UiCard className="flex-1 items-center py-3">
          <Text className="text-2xl font-bold text-amber-700">{lowStock.length}</Text>
          <Text className="mt-1 text-center text-xs text-stone-500">Düşük stok</Text>
        </UiCard>
      </View>

      <MenuTile
        title="Bekleyen siparişler"
        subtitle="Yeni gelen siparişleri işle"
        icon="receipt-outline"
        badge={pendingOrders}
        onPress={() => navigation.navigate('Orders')}
      />
      <MenuTile
        title="Ürünlerim"
        subtitle="Stok ve fiyat güncelle"
        icon="cube-outline"
        onPress={() => navigation.navigate('Products')}
      />

      {(() => {
        const status: LicenseStatus = getLicenseStatus(licenseExpiresAt);
        if (status === 'active') return null;
        const isExpired = status === 'expired' || status === 'missing';
        return (
          <View
            className={`mb-4 rounded-2xl border p-4 ${
              isExpired
                ? 'border-red-200 bg-red-50'
                : 'border-amber-200 bg-amber-50'
            }`}
          >
            <Text
              className={`mb-1 text-sm font-bold ${
                isExpired ? 'text-red-900' : 'text-amber-900'
              }`}
            >
              {status === 'missing'
                ? 'Lisans gerekli'
                : status === 'expired'
                  ? 'Lisans süresi doldu'
                  : 'Lisans yakında bitiyor'}
            </Text>
            <Text
              className={`mb-3 text-xs ${
                isExpired ? 'text-red-800' : 'text-amber-800'
              }`}
            >
              {status === 'missing'
                ? 'Yeni ürün eklemek için admin’den lisans anahtarı alıp Mağaza sekmesinde aktive et.'
                : status === 'expired'
                  ? 'Süreyi uzatmak için yeni bir anahtar gir. Mevcut ürünler görünür kalır.'
                  : `Bitiş: ${
                      licenseExpiresAt
                        ? formatLicenseExpiry(licenseExpiresAt)
                        : ''
                    }. Yenilemeyi unutma.`}
            </Text>
            <Pressable
              className={`items-center rounded-xl py-2.5 ${
                isExpired ? 'bg-red-600' : 'bg-amber-600'
              }`}
              onPress={() => navigation.navigate('StoreSettings')}
            >
              <Text className="font-semibold text-white">Lisansı yönet</Text>
            </Pressable>
          </View>
        );
      })()}

      {lowStock.length > 0 ? (
        <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Text className="mb-1 text-sm font-bold text-amber-900">
            Düşük stok uyarısı
          </Text>
          <Text className="mb-3 text-xs text-amber-800">
            {lowStock.length} aktif ürün stoku {LOW_STOCK_THRESHOLD} veya altında.
          </Text>
          {lowStock.slice(0, 5).map((p) => (
            <View
              key={p.id}
              className="mb-2 flex-row items-center justify-between rounded-xl bg-white/80 px-3 py-2"
            >
              <Text className="flex-1 pr-2 text-sm font-medium text-stone-800" numberOfLines={1}>
                {p.name}
              </Text>
              <Text className="text-sm font-bold text-amber-700">{p.stock} adet</Text>
            </View>
          ))}
          <Pressable
            className="mt-1 items-center rounded-xl bg-amber-600 py-2.5"
            onPress={() => navigation.navigate('Products')}
          >
            <Text className="font-semibold text-white">Ürünlerime git</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mb-4 rounded-2xl border border-green-100 bg-green-50 p-4">
          <Text className="text-sm font-semibold text-green-800">Stok durumu iyi</Text>
          <Text className="mt-1 text-xs text-green-700">
            Aktif ürünlerde {LOW_STOCK_THRESHOLD} altı stok yok.
          </Text>
        </View>
      )}

      <UiCard className="mb-4">
        <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">
          Değerlendirme
        </Text>
        {summary.count === 0 ? (
          <Text className="text-sm text-stone-500">Henüz yorum yok.</Text>
        ) : (
          <View className="flex-row items-center">
            <StarRating value={Math.round(summary.average)} readonly />
            <Text className="ml-3 text-lg font-semibold text-stone-900">
              {summary.average}
            </Text>
            <Text className="ml-2 text-sm text-stone-500">({summary.count})</Text>
          </View>
        )}
      </UiCard>

      <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">
        Son yorumlar
      </Text>
      {reviews.length === 0 ? (
        <Text className="text-sm text-stone-500">Gösterilecek yorum yok.</Text>
      ) : (
        reviews.map((review) => (
          <UiCard key={review.id} className="mb-3">
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="font-medium text-stone-800">Alıcı</Text>
              <StarRating value={review.rating} readonly size="sm" />
            </View>
            {review.comment ? (
              <Text className="text-sm text-stone-600">{review.comment}</Text>
            ) : (
              <Text className="text-sm italic text-stone-400">Yorum yok</Text>
            )}
            <Text className="mt-2 text-xs text-stone-400">
              {new Date(review.created_at).toLocaleString('tr-TR')}
            </Text>
          </UiCard>
        ))
      )}
    </ScrollView>
  );
}

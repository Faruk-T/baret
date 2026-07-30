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

import { StarRating } from '../../components/common/StarRating';
import { LOW_STOCK_THRESHOLD, isLowStock } from '../../constants/inventory';
import { useAuth } from '../../context/AuthContext';
import { listStoreProducts } from '../../services/products';
import { getMyStore } from '../../services/stores';
import {
  getStoreRatingSummary,
  listStoreReviews,
  type ReviewWithBuyer,
} from '../../services/reviews';
import type { Product } from '../../types/database';
import type { SellerTabParamList } from '../../types/navigation.types';

type TabNav = BottomTabNavigationProp<SellerTabParamList>;

export function SellerDashboardScreen() {
  const navigation = useNavigation<TabNav>();
  const { user } = useAuth();
  const [storeName, setStoreName] = useState<string | null>(null);
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
        setReviews([]);
        setSummary({ average: 0, count: 0 });
        setLowStock([]);
        return;
      }
      setStoreName(store.name);
      const [rating, rows, products] = await Promise.all([
        getStoreRatingSummary(store.id),
        listStoreReviews(store.id),
        listStoreProducts(store.id),
      ]);
      setSummary(rating);
      setReviews(rows);
      setLowStock(
        products.filter((p) => isLowStock(p.stock, p.is_active)).sort((a, b) => a.stock - b.stock)
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
    }, [load])
  );

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
          Önce Mağaza sekmesinden profil oluştur.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-stone-50"
      contentContainerClassName="px-4 py-4 pb-10"
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
    >
      <Text className="mb-1 text-xl font-bold text-stone-900">{storeName}</Text>
      <Text className="mb-4 text-sm text-stone-500">Mağaza özeti</Text>

      {lowStock.length > 0 ? (
        <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Text className="mb-1 text-sm font-bold text-amber-900">
            Düşük stok uyarısı
          </Text>
          <Text className="mb-3 text-xs text-amber-800">
            {lowStock.length} aktif ürün stoku {LOW_STOCK_THRESHOLD} veya altında. Yeniden stok
            eklemen önerilir.
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
          {lowStock.length > 5 ? (
            <Text className="mb-2 text-xs text-amber-700">
              +{lowStock.length - 5} ürün daha…
            </Text>
          ) : null}
          <Pressable
            className="mt-1 items-center rounded-xl bg-amber-600 py-2.5"
            onPress={() => navigation.navigate('Products')}
          >
            <Text className="font-semibold text-white">Ürünlerime git</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mb-4 rounded-2xl border border-green-100 bg-green-50 p-4">
          <Text className="text-sm font-semibold text-green-800">
            Stok durumu iyi
          </Text>
          <Text className="mt-1 text-xs text-green-700">
            Aktif ürünlerde {LOW_STOCK_THRESHOLD} altı stok yok.
          </Text>
        </View>
      )}

      <View className="mb-4 rounded-2xl border border-stone-200 bg-white p-4">
        <Text className="mb-2 text-xs font-semibold uppercase text-stone-500">
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
      </View>

      <Text className="mb-2 text-xs font-semibold uppercase text-stone-500">
        Son yorumlar
      </Text>
      {reviews.length === 0 ? (
        <Text className="text-sm text-stone-500">Gösterilecek yorum yok.</Text>
      ) : (
        reviews.map((review) => (
          <View
            key={review.id}
            className="mb-3 rounded-2xl border border-stone-200 bg-white p-4"
          >
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
          </View>
        ))
      )}
    </ScrollView>
  );
}

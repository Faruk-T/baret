import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { StarRating } from '../../components/common/StarRating';
import { useAuth } from '../../context/AuthContext';
import { getMyStore } from '../../services/stores';
import {
  getStoreRatingSummary,
  listStoreReviews,
  type ReviewWithBuyer,
} from '../../services/reviews';

export function SellerDashboardScreen() {
  const { user } = useAuth();
  const [storeName, setStoreName] = useState<string | null>(null);
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [reviews, setReviews] = useState<ReviewWithBuyer[]>([]);
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
        return;
      }
      setStoreName(store.name);
      const [rating, rows] = await Promise.all([
        getStoreRatingSummary(store.id),
        listStoreReviews(store.id),
      ]);
      setSummary(rating);
      setReviews(rows);
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

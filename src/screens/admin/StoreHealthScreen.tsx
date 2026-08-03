import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { listStoreHealth, type StoreHealth } from '../../services/adminOps';
import type { AdminStackParamList } from '../../types/navigation.types';
import { ui } from '../../theme/ui';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'StoreHealth'>;

export function StoreHealthScreen() {
  const navigation = useNavigation<Nav>();
  const [rows, setRows] = useState<StoreHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await listStoreHealth());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator color={ui.brand} />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-[#FFF8F3]"
      data={rows}
      keyExtractor={(item) => item.store.id}
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
          <Text className="text-2xl font-bold text-stone-900">Mağaza sağlığı</Text>
          <Text className="mt-1 text-sm text-stone-500">
            Düşük skor üstte — stok, gecikme, puan, şikayet
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const color =
          item.score >= 80 ? '#16a34a' : item.score >= 55 ? '#d97706' : '#dc2626';
        return (
          <Pressable
            className="mb-3 rounded-3xl border border-stone-200 bg-white p-4"
            onPress={() =>
              navigation.navigate('SellerAdminDetail', {
                userId: item.store.owner_id,
                storeId: item.store.id,
              })
            }
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="font-bold text-stone-900">{item.store.name}</Text>
                <Text className="text-xs text-stone-500">{item.store.city}</Text>
              </View>
              <View
                className="h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${color}22` }}
              >
                <Text className="text-xl font-bold" style={{ color }}>
                  {item.score}
                </Text>
              </View>
            </View>
            <Text className="mt-2 text-xs text-stone-600">
              {item.productCount} ürün · {item.lowStockCount} düşük stok · puan{' '}
              {item.ratingCount ? item.ratingAverage : '—'} ·{' '}
              {item.openReports} şikayet
            </Text>
            {item.flags.length ? (
              <Text className="mt-1 text-xs font-semibold text-amber-800">
                {item.flags.join(' · ')}
              </Text>
            ) : (
              <Text className="mt-1 text-xs text-green-700">Sağlıklı</Text>
            )}
          </Pressable>
        );
      }}
    />
  );
}

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

import {
  listProductsAdmin,
  setProductActiveAdmin,
  writeAuditLog,
} from '../../services/adminOps';
import { useAuth } from '../../context/AuthContext';
import type { Product } from '../../types/database';
import { ui } from '../../theme/ui';

type Row = Product & { stores: { name: string } | null };

export function ProductModerationScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await listProductsAdmin());
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

  const toggle = (item: Row) => {
    const next = !item.is_active;
    Alert.alert(
      next ? 'Ürünü aç' : 'Ürünü kaldır',
      `"${item.name}" ${next ? 'aktif' : 'pasif'} yapılsın mı?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: () => {
            void (async () => {
              try {
                await setProductActiveAdmin(item.id, next);
                if (user?.id) {
                  await writeAuditLog({
                    actorId: user.id,
                    action: next ? 'product.activate' : 'product.deactivate',
                    entityType: 'product',
                    entityId: item.id,
                    meta: { name: item.name },
                  });
                }
                await load();
              } catch (e) {
                Alert.alert(
                  'Hata',
                  e instanceof Error ? e.message : 'Güncellenemedi.'
                );
              }
            })();
          },
        },
      ]
    );
  };

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
          <Text className="text-2xl font-bold text-stone-900">İçerik denetimi</Text>
          <Text className="mt-1 text-sm text-stone-500">
            Şüpheli ürünü tek dokunuşla pasife al
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View className="mb-3 flex-row rounded-3xl border border-stone-200 bg-white p-3">
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              className="mr-3 h-16 w-16 rounded-xl bg-stone-100"
            />
          ) : (
            <View className="mr-3 h-16 w-16 items-center justify-center rounded-xl bg-amber-50">
              <Text className="text-[10px] font-bold text-amber-700">Görsel yok</Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="font-bold text-stone-900" numberOfLines={2}>
              {item.name}
            </Text>
            <Text className="text-xs text-stone-500">
              {item.stores?.name ?? 'Mağaza'} · stok {item.stock}
            </Text>
            <Pressable
              className={`mt-2 self-start rounded-xl px-3 py-1.5 ${
                item.is_active ? 'bg-red-600' : 'bg-brand'
              }`}
              onPress={() => toggle(item)}
            >
              <Text className="text-xs font-bold text-white">
                {item.is_active ? 'Kaldır' : 'Aç'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

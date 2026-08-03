import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../context/AuthContext';
import {
  createNotification,
  writeAuditLog,
} from '../../services/adminOps';
import {
  listPlatformReportsAdmin,
  updatePlatformReportStatus,
} from '../../services/reports';
import {
  getStoreById,
  rejectStore,
  unapproveStore,
} from '../../services/stores';
import type { PlatformReport, Store } from '../../types/database';
import type { AdminStackParamList } from '../../types/navigation.types';
import { ui } from '../../theme/ui';

const STATUS_LABEL: Record<PlatformReport['status'], string> = {
  open: 'Açık',
  reviewed: 'İncelendi',
  closed: 'Kapalı',
};

type Nav = NativeStackNavigationProp<AdminStackParamList, 'Reports'>;

export function ReportsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [rows, setRows] = useState<PlatformReport[]>([]);
  const [stores, setStores] = useState<Record<string, Store>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listPlatformReportsAdmin();
      setRows(data);
      const uniqueStoreIds = [...new Set(data.map((r) => r.store_id))];
      const pairs = await Promise.all(
        uniqueStoreIds.map(async (id) => {
          try {
            const store = await getStoreById(id);
            return [id, store] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      const map: Record<string, Store> = {};
      for (const [id, store] of pairs) {
        if (store) map[id] = store;
      }
      setStores(map);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Şikayetler yüklenemedi. anti-leakage SQL çalıştı mı?'
      );
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

  const setStatus = (item: PlatformReport, status: PlatformReport['status']) => {
    Alert.alert('Durum güncelle', `"${STATUS_LABEL[status]}" yapılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Güncelle',
        onPress: () => {
          void (async () => {
            try {
              await updatePlatformReportStatus(item.id, status);
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
    ]);
  };

  const suspendStore = (item: PlatformReport) => {
    const store = stores[item.store_id];
    Alert.alert(
      'Mağazayı askıya al',
      `${store?.name ?? 'Mağaza'} onayı geri alınsın ve pasife çekilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Askıya al',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await unapproveStore(item.store_id);
                await rejectStore(item.store_id);
                await updatePlatformReportStatus(
                  item.id,
                  'reviewed',
                  'Admin: mağaza askıya alındı'
                );
                if (user?.id) {
                  await writeAuditLog({
                    actorId: user.id,
                    action: 'store.suspend',
                    entityType: 'store',
                    entityId: item.store_id,
                    meta: { reportId: item.id },
                  });
                  const store = stores[item.store_id];
                  if (store?.owner_id) {
                    await createNotification({
                      userId: store.owner_id,
                      title: 'Mağaza askıya alındı',
                      body: 'Bir şikayet sonrası mağazan askıya alındı. Destek ile iletişime geç.',
                      kind: 'warning',
                      createdBy: user.id,
                    }).catch(() => undefined);
                  }
                }
                await load();
                Alert.alert('Tamam', 'Mağaza askıya alındı.');
              } catch (e) {
                Alert.alert(
                  'Hata',
                  e instanceof Error ? e.message : 'İşlem başarısız.'
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
          <Text className="text-sm text-stone-500">
            {rows.length} şikayet · incele, kapat veya mağazayı askıya al
          </Text>
          {error ? (
            <Text className="mt-2 text-sm text-red-600">{error}</Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <Text className="mt-10 text-center text-sm text-stone-500">
          Açık şikayet yok.
        </Text>
      }
      renderItem={({ item }) => {
        const store = stores[item.store_id];
        return (
          <View className="mb-3 rounded-2xl border border-stone-200 bg-white p-4">
            <View className="mb-2 flex-row items-start justify-between">
              <Text className="flex-1 pr-2 font-bold text-stone-900">
                {item.reason}
              </Text>
              <View className="rounded-full bg-orange-50 px-2.5 py-1">
                <Text className="text-xs font-bold text-brand">
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>
            </View>
            {item.details ? (
              <Text className="mb-2 text-sm text-stone-600">{item.details}</Text>
            ) : null}
            <Text className="text-xs font-semibold text-stone-700">
              Mağaza: {store?.name ?? `${item.store_id.slice(0, 8)}…`}
              {store?.city ? ` · ${store.city}` : ''}
            </Text>
            {item.order_id ? (
              <Text className="mt-1 text-xs text-stone-400">
                Sipariş: {item.order_id.slice(0, 8)}…
              </Text>
            ) : null}
            <Text className="mt-1 text-xs text-stone-400">
              {new Date(item.created_at).toLocaleString('tr-TR')}
            </Text>

            <View className="mt-3 flex-row flex-wrap gap-2">
              {item.status === 'open' ? (
                <>
                  <Action
                    label="İncelendi"
                    onPress={() => setStatus(item, 'reviewed')}
                  />
                  <Action
                    label="Kapat"
                    muted
                    onPress={() => setStatus(item, 'closed')}
                  />
                </>
              ) : item.status === 'reviewed' ? (
                <Action
                  label="Kapat"
                  muted
                  onPress={() => setStatus(item, 'closed')}
                />
              ) : null}
              <Action
                label="Askıya al"
                danger
                onPress={() => suspendStore(item)}
              />
              {store ? (
                <Action
                  label="Satıcıya git"
                  muted
                  onPress={() =>
                    navigation.navigate('SellerAdminDetail', {
                      userId: store.owner_id,
                      storeId: store.id,
                    })
                  }
                />
              ) : null}
            </View>
          </View>
        );
      }}
    />
  );
}

function Action({
  label,
  onPress,
  muted,
  danger,
}: {
  label: string;
  onPress: () => void;
  muted?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      className={`rounded-xl px-3 py-2 ${
        danger
          ? 'bg-red-600'
          : muted
            ? 'border border-stone-200 bg-stone-50'
            : 'bg-brand'
      }`}
      onPress={onPress}
    >
      <Text
        className={`text-xs font-bold ${
          muted ? 'text-stone-700' : 'text-white'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

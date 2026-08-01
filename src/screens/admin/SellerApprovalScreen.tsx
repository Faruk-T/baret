import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../context/AuthContext';
import { writeAuditLog } from '../../services/adminOps';
import {
  approveStore,
  listAllStoresAdmin,
  reactivateStore,
  rejectStore,
  unapproveStore,
} from '../../services/stores';
import type { Store } from '../../types/database';

type Filter = 'pending' | 'approved' | 'all';

export function SellerApprovalScreen() {
  const { user, signOut } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listAllStoresAdmin();
      setStores(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Mağaza listesi yüklenemedi. Admin rolü gerekir.';
      Alert.alert('Hata', message);
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

  const filtered = useMemo(() => {
    if (filter === 'pending') {
      return stores.filter((s) => !s.is_approved && s.is_active);
    }
    if (filter === 'approved') {
      return stores.filter((s) => s.is_approved);
    }
    return stores;
  }, [stores, filter]);

  const pendingCount = stores.filter((s) => !s.is_approved && s.is_active).length;
  const approvedCount = stores.filter((s) => s.is_approved).length;

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Çıkış yapılamadı.';
      Alert.alert('Hata', message);
    } finally {
      setSigningOut(false);
    }
  };

  const onApprove = (store: Store) => {
    Alert.alert('Mağazayı onayla', `"${store.name}" onaylansın mı? Ürünleri katalogda görünür.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: () => {
          void (async () => {
            try {
              await approveStore(store.id);
              if (user?.id) {
                await writeAuditLog({
                  actorId: user.id,
                  action: 'store.approve',
                  entityType: 'store',
                  entityId: store.id,
                  meta: { name: store.name },
                });
              }
              await load();
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Onaylanamadı.';
              Alert.alert('Hata', message);
            }
          })();
        },
      },
    ]);
  };

  const onUnapprove = (store: Store) => {
    Alert.alert(
      'Onayı geri al',
      `"${store.name}" tekrar onay bekliyor olsun mu? Katalogdan düşer.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Geri al',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await unapproveStore(store.id);
                if (user?.id) {
                  await writeAuditLog({
                    actorId: user.id,
                    action: 'store.unapprove',
                    entityType: 'store',
                    entityId: store.id,
                    meta: { name: store.name },
                  });
                }
                await load();
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : 'İşlem başarısız.';
                Alert.alert('Hata', message);
              }
            })();
          },
        },
      ]
    );
  };

  const onReject = (store: Store) => {
    Alert.alert('Pasife al', `"${store.name}" pasife alınsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Pasife al',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await rejectStore(store.id);
              if (user?.id) {
                await writeAuditLog({
                  actorId: user.id,
                  action: 'store.reject',
                  entityType: 'store',
                  entityId: store.id,
                  meta: { name: store.name },
                });
              }
              await load();
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'İşlem başarısız.';
              Alert.alert('Hata', message);
            }
          })();
        },
      },
    ]);
  };

  const onReactivate = (store: Store) => {
    void (async () => {
      try {
        await reactivateStore(store.id);
        if (user?.id) {
          await writeAuditLog({
            actorId: user.id,
            action: 'store.reactivate',
            entityType: 'store',
            entityId: store.id,
            meta: { name: store.name },
          });
        }
        await load();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'İşlem başarısız.';
        Alert.alert('Hata', message);
      }
    })();
  };

  const FilterChip = ({ id, label, count }: { id: Filter; label: string; count: number }) => {
    const selected = filter === id;
    return (
      <Pressable
        onPress={() => setFilter(id)}
        className={`mr-2 rounded-full border px-3 py-2 ${
          selected ? 'border-brand bg-orange-50' : 'border-stone-200 bg-white'
        }`}
      >
        <Text className={`text-sm ${selected ? 'font-semibold text-brand' : 'text-stone-700'}`}>
          {label} ({count})
        </Text>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50">
        <ActivityIndicator color="#FF6B00" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-stone-50">
      <View className="border-b border-stone-200 bg-white px-4 py-3">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm text-stone-600">
            Toplam {stores.length} mağaza · {pendingCount} bekleyen
          </Text>
          <Pressable disabled={signingOut} onPress={() => void handleSignOut()}>
            <Text className="text-sm font-semibold text-red-600">
              {signingOut ? '...' : 'Çıkış'}
            </Text>
          </Pressable>
        </View>
        <View className="flex-row">
          <FilterChip id="pending" label="Bekleyen" count={pendingCount} />
          <FilterChip id="approved" label="Onaylı" count={approvedCount} />
          <FilterChip id="all" label="Tümü" count={stores.length} />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 py-3 grow"
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
        ListEmptyComponent={
          <View className="items-center justify-center px-6 py-16">
            <Text className="mb-2 text-lg font-semibold text-stone-900">
              {filter === 'pending' ? 'Bekleyen onay yok' : 'Kayıt yok'}
            </Text>
            <Text className="mb-4 text-center text-sm text-stone-500">
              {filter === 'pending'
                ? 'SQL ile onayladıysan liste boş görünür. “Onaylı” veya “Tümü” filtresine bak.'
                : 'Henüz mağaza kaydı yok.'}
            </Text>
            <Pressable
              className="rounded-xl bg-brand px-4 py-3"
              onPress={() => {
                setRefreshing(true);
                void load();
              }}
            >
              <Text className="font-semibold text-white">Yenile</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-2xl border border-stone-200 bg-white p-4">
            <View className="mb-1 flex-row items-start justify-between">
              <Text className="flex-1 pr-2 text-lg font-semibold text-stone-900">
                {item.name}
              </Text>
              <Text
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  !item.is_active
                    ? 'bg-stone-100 text-stone-600'
                    : item.is_approved
                      ? 'bg-green-50 text-green-700'
                      : 'bg-amber-50 text-amber-700'
                }`}
              >
                {!item.is_active
                  ? 'Pasif'
                  : item.is_approved
                    ? 'Onaylı'
                    : 'Onay bekliyor'}
              </Text>
            </View>
            <Text className="text-sm text-stone-600">
              {item.city}
              {item.district ? ` / ${item.district}` : ''}
            </Text>
            <Text className="mt-1 text-sm text-stone-500">{item.address}</Text>
            <Text className="mt-1 text-sm text-stone-500">{item.phone}</Text>
            {item.description ? (
              <Text className="mt-2 text-sm text-stone-600" numberOfLines={3}>
                {item.description}
              </Text>
            ) : null}

            <View className="mt-3 flex-row flex-wrap gap-2">
              {!item.is_approved && item.is_active ? (
                <Pressable
                  className="rounded-xl bg-brand px-4 py-2.5"
                  onPress={() => onApprove(item)}
                >
                  <Text className="font-semibold text-white">Onayla</Text>
                </Pressable>
              ) : null}
              {item.is_approved ? (
                <Pressable
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5"
                  onPress={() => onUnapprove(item)}
                >
                  <Text className="font-semibold text-amber-800">Onayı geri al</Text>
                </Pressable>
              ) : null}
              {item.is_active ? (
                <Pressable
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5"
                  onPress={() => onReject(item)}
                >
                  <Text className="font-semibold text-red-700">Pasife al</Text>
                </Pressable>
              ) : (
                <Pressable
                  className="rounded-xl border border-stone-200 bg-stone-100 px-4 py-2.5"
                  onPress={() => onReactivate(item)}
                >
                  <Text className="font-semibold text-stone-800">Aktifleştir</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import {
  collectStoreCommissions,
  getStoreCommissionDetail,
} from '../../services/commission';
import { writeAuditLog } from '../../services/adminOps';
import type { AdminStackParamList } from '../../types/navigation.types';
import { ui } from '../../theme/ui';

type Props = NativeStackScreenProps<AdminStackParamList, 'StoreCommissionDetail'>;

function money(value: number): string {
  return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StoreCommissionDetailScreen({ route }: Props) {
  const { user } = useAuth();
  const { storeId, storeName } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof getStoreCommissionDetail>
  > | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setDetail(await getStoreCommissionDetail(storeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Detay yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const unsettled = (detail?.lines ?? []).filter((l) => l.collection_id == null);
  const unsettledTotal = unsettled.reduce(
    (sum, l) => sum + Number(l.commission_amount),
    0
  );

  const handleCollect = () => {
    if (unsettled.length === 0) {
      Alert.alert('Bilgi', 'Tahsil edilecek bekleyen komisyon yok.');
      return;
    }
    Alert.alert(
      'Tahsilatı onayla',
      `${storeName} için ${money(unsettledTotal)} (${unsettled.length} sipariş) tahsil edildi olarak işaretlensin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Onayla',
          style: 'default',
          onPress: () => {
            void (async () => {
              try {
                setCollecting(true);
                const row = await collectStoreCommissions(storeId, note);
                if (user?.id) {
                  await writeAuditLog({
                    actorId: user.id,
                    action: 'commission.collect',
                    entityType: 'store',
                    entityId: storeId,
                    meta: {
                      amount: row.amount,
                      order_count: row.order_count,
                      storeName,
                    },
                  });
                }
                setNote('');
                await load();
                Alert.alert('Tamam', 'Tahsilat kaydedildi.');
              } catch (e) {
                Alert.alert(
                  'Hata',
                  e instanceof Error ? e.message : 'Tahsilat kaydedilemedi.'
                );
              } finally {
                setCollecting(false);
              }
            })();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0B1220]">
        <ActivityIndicator color="#FF6B00" />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-[#0B1220]"
      data={detail?.lines ?? []}
      keyExtractor={(item) => item.id}
      contentContainerClassName="px-4 pb-12 pt-3"
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
      ListHeaderComponent={
        <View className="mb-4">
          <Text className="text-2xl font-bold text-white">{storeName}</Text>
          <Text className="mt-1 text-sm text-stone-400">
            Satıcı bazlı komisyon ve tahsilat geçmişi
          </Text>

          {error ? (
            <Text className="mt-3 text-sm text-red-400">{error}</Text>
          ) : null}

          <View className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <Text className="text-xs font-bold uppercase tracking-wide text-amber-400">
              Bekleyen tahsilat
            </Text>
            <Text className="mt-2 text-3xl font-bold text-white">
              {money(unsettledTotal)}
            </Text>
            <Text className="mt-1 text-sm text-stone-400">
              {unsettled.length} sipariş satırı henüz alınmadı
            </Text>

            <TextInput
              className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
              placeholder="Not (opsiyonel) — örn. Nisan 2026 havale"
              placeholderTextColor="#78716c"
              value={note}
              onChangeText={setNote}
            />

            <Pressable
              className={`mt-3 flex-row items-center justify-center rounded-2xl bg-brand py-3.5 ${
                collecting || unsettled.length === 0 ? 'opacity-50' : ''
              }`}
              disabled={collecting || unsettled.length === 0}
              onPress={handleCollect}
              style={ui.shadow}
            >
              {collecting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text className="ml-2 font-bold text-white">
                    Tahsil edildi olarak işaretle
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {(detail?.collections.length ?? 0) > 0 ? (
            <View className="mt-5">
              <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">
                Tahsilat geçmişi
              </Text>
              {detail!.collections.map((c) => (
                <View
                  key={c.id}
                  className="mb-2 flex-row items-center rounded-2xl border border-green-500/30 bg-green-500/10 px-3 py-3"
                >
                  <Ionicons name="checkmark-done" size={20} color="#4ade80" />
                  <View className="ml-3 flex-1">
                    <Text className="font-bold text-green-300">
                      {money(Number(c.amount))}
                    </Text>
                    <Text className="text-xs text-stone-400">
                      {formatDate(c.collected_at)} · {c.order_count} sipariş
                      {c.note ? ` · ${c.note}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-stone-400">
            Sipariş komisyonları
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text className="mt-8 text-center text-sm text-stone-500">
          Bu mağazada henüz komisyon satırı yok.
        </Text>
      }
      renderItem={({ item }) => {
        const settled = item.collection_id != null;
        return (
          <View className="mb-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text className="font-semibold text-white">
                  {item.products?.name ?? 'Ürün'}
                </Text>
                <Text className="mt-1 text-xs text-stone-400">
                  {formatDate(item.created_at)} · Sipariş {money(Number(item.order_amount))}
                </Text>
              </View>
              <View
                className={`rounded-full px-2.5 py-1 ${
                  settled ? 'bg-green-500/20' : 'bg-amber-500/20'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    settled ? 'text-green-300' : 'text-amber-300'
                  }`}
                >
                  {settled ? 'Alındı' : 'Bekliyor'}
                </Text>
              </View>
            </View>
            <Text className="mt-2 text-sm font-bold text-brand">
              Platform: {money(Number(item.commission_amount))}
              <Text className="font-normal text-stone-400">
                {' '}
                · %{Number(item.commission_rate)}
              </Text>
            </Text>
          </View>
        );
      }}
    />
  );
}

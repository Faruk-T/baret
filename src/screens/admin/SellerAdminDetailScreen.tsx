import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { listSellersAdmin } from '../../services/adminPeople';
import {
  approveStore,
  rejectStore,
  unapproveStore,
} from '../../services/stores';
import type { AdminStackParamList } from '../../types/navigation.types';
import { ui } from '../../theme/ui';

type Props = NativeStackScreenProps<AdminStackParamList, 'SellerAdminDetail'>;

function money(value: number): string {
  return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

export function SellerAdminDetailScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [row, setRow] = useState<
    Awaited<ReturnType<typeof listSellersAdmin>>[number] | null
  >(null);

  const load = useCallback(async () => {
    try {
      const all = await listSellersAdmin();
      setRow(all.find((s) => s.user.id === userId) ?? null);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const run = async (action: () => Promise<unknown>, okMsg: string) => {
    try {
      setBusy(true);
      await action();
      await load();
      Alert.alert('Tamam', okMsg);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'İşlem başarısız.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator color={ui.brand} />
      </View>
    );
  }

  if (!row) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3] px-6">
        <Text className="text-center text-stone-500">Satıcı bulunamadı.</Text>
      </View>
    );
  }

  const store = row.store;

  return (
    <ScrollView
      className="flex-1 bg-[#FFF8F3]"
      contentContainerClassName="px-4 py-4 pb-12"
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
      <Text className="text-2xl font-bold text-stone-900">
        {store?.name ?? row.user.full_name ?? 'Satıcı'}
      </Text>
      <Text className="mt-1 text-sm text-stone-500">{row.user.email}</Text>
      {row.user.phone ? (
        <Text className="mt-1 text-sm text-stone-500">{row.user.phone}</Text>
      ) : null}

      <View className="mt-4 flex-row flex-wrap justify-between">
        <Metric label="Ürün" value={String(row.productCount)} />
        <Metric label="Stok" value={String(row.stockTotal)} />
        <Metric label="Sipariş" value={String(row.orderCount)} />
        <Metric
          label="Puan"
          value={row.ratingCount ? String(row.ratingAverage) : '—'}
        />
      </View>

      {store ? (
        <View className="mt-4 rounded-3xl border border-stone-200 bg-white p-4">
          <Text className="text-xs font-bold uppercase text-stone-500">
            Mağaza
          </Text>
          <Text className="mt-2 text-sm text-stone-700">
            {store.address}
            {store.district ? `, ${store.district}` : ''} / {store.city}
          </Text>
          <Text className="mt-1 text-sm text-stone-600">{store.phone}</Text>
          <Text className="mt-3 text-sm font-semibold text-stone-900">
            Durum:{' '}
            <Text className={store.is_approved ? 'text-green-600' : 'text-amber-600'}>
              {store.is_approved ? 'Onaylı' : 'Onay bekliyor'}
              {!store.is_active ? ' · Pasif' : ''}
            </Text>
          </Text>
          <Text className="mt-2 text-sm text-amber-800">
            Bekleyen komisyon: {money(row.unsettledCommission)}
          </Text>
        </View>
      ) : (
        <View className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <Text className="text-sm text-amber-900">
            Bu satıcı henüz mağaza oluşturmamış.
          </Text>
        </View>
      )}

      {store ? (
        <View className="mt-4 gap-2">
          {!store.is_approved ? (
            <Action
              label="Mağazayı onayla"
              icon="checkmark-circle"
              onPress={() =>
                void run(() => approveStore(store.id), 'Mağaza onaylandı.')
              }
              disabled={busy}
            />
          ) : (
            <Action
              label="Onayı geri al"
              icon="close-circle-outline"
              variant="muted"
              onPress={() =>
                void run(() => unapproveStore(store.id), 'Onay geri alındı.')
              }
              disabled={busy}
            />
          )}
          {store.is_active ? (
            <Action
              label="Mağazayı pasife al"
              icon="ban-outline"
              variant="danger"
              onPress={() =>
                void run(() => rejectStore(store.id), 'Mağaza pasif.')
              }
              disabled={busy}
            />
          ) : null}
          <Action
            label="Komisyon / tahsilat"
            icon="cash-outline"
            onPress={() =>
              navigation.navigate('StoreCommissionDetail', {
                storeId: store.id,
                storeName: store.name,
              })
            }
            disabled={busy}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 w-[48%] rounded-2xl border border-stone-200 bg-white px-3 py-3">
      <Text className="text-2xl font-bold text-brand">{value}</Text>
      <Text className="mt-1 text-xs text-stone-500">{label}</Text>
    </View>
  );
}

function Action({
  label,
  icon,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'muted' | 'danger';
}) {
  const bg =
    variant === 'primary'
      ? 'bg-brand'
      : variant === 'danger'
        ? 'bg-red-600'
        : 'bg-stone-800';
  return (
    <Pressable
      className={`flex-row items-center justify-center rounded-2xl py-3.5 ${bg} ${
        disabled ? 'opacity-50' : ''
      }`}
      disabled={disabled}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color="#fff" />
      <Text className="ml-2 font-bold text-white">{label}</Text>
    </Pressable>
  );
}

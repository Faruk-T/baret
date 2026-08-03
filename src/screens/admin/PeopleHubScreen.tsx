import { useCallback, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  listBuyersAdmin,
  listSellersAdmin,
  type AdminBuyerRow,
  type AdminSellerRow,
} from '../../services/adminPeople';
import type { AdminStackParamList } from '../../types/navigation.types';
import { ui } from '../../theme/ui';

type Tab = 'buyers' | 'sellers';
type Nav = NativeStackNavigationProp<AdminStackParamList, 'PeopleHub'>;

function money(value: number): string {
  return `₺${value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
}

export function PeopleHubScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('sellers');
  const [buyers, setBuyers] = useState<AdminBuyerRow[]>([]);
  const [sellers, setSellers] = useState<AdminSellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [b, s] = await Promise.all([listBuyersAdmin(), listSellersAdmin()]);
      setBuyers(b);
      setSellers(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Liste yüklenemedi.');
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

  const header = useMemo(
    () => (
      <View className="mb-3">
        <LinearGradient
          colors={['#1a2740', '#0B1220']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24,
            padding: 18,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <Text className="text-xs font-bold uppercase tracking-wide text-stone-400">
            İnsanlar
          </Text>
          <Text className="mt-1 text-2xl font-bold text-white">
            Alıcı & satıcı yönetimi
          </Text>
          <Text className="mt-2 text-sm text-stone-400">
            Aktif hesaplar, stok, puan ve sipariş özeti tek panelde.
          </Text>
          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-white/5 px-3 py-3">
              <Text className="text-xl font-bold text-brand">{sellers.length}</Text>
              <Text className="text-xs text-stone-400">Satıcı</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white/5 px-3 py-3">
              <Text className="text-xl font-bold text-sky-300">{buyers.length}</Text>
              <Text className="text-xs text-stone-400">Alıcı</Text>
            </View>
          </View>
        </LinearGradient>

        <View className="mb-3 flex-row rounded-2xl border border-stone-200 bg-white p-1">
          {(
            [
              { id: 'sellers' as const, label: 'Satıcılar' },
              { id: 'buyers' as const, label: 'Alıcılar' },
            ] as const
          ).map((item) => {
            const active = tab === item.id;
            return (
              <Pressable
                key={item.id}
                className={`flex-1 items-center rounded-xl py-2.5 ${
                  active ? 'bg-brand' : ''
                }`}
                onPress={() => setTab(item.id)}
              >
                <Text
                  className={`text-sm font-bold ${
                    active ? 'text-white' : 'text-stone-600'
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text className="mb-2 text-sm text-red-600">{error}</Text> : null}
      </View>
    ),
    [buyers.length, error, sellers.length, tab]
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator color={ui.brand} />
      </View>
    );
  }

  if (tab === 'sellers') {
    return (
      <FlatList
        className="flex-1 bg-[#FFF8F3]"
        data={sellers}
        keyExtractor={(item) => item.user.id}
        contentContainerClassName="px-4 py-3 pb-10"
        ListHeaderComponent={header}
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
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-stone-500">
            Kayıtlı satıcı yok.
          </Text>
        }
        renderItem={({ item }) => {
          const approved = item.store?.is_approved;
          return (
            <Pressable
              className="mb-3 rounded-3xl border border-stone-200 bg-white p-4"
              style={ui.shadow}
              onPress={() =>
                navigation.navigate('SellerAdminDetail', {
                  userId: item.user.id,
                  storeId: item.store?.id,
                })
              }
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-base font-bold text-stone-900">
                    {item.store?.name ?? item.user.full_name ?? 'Satıcı'}
                  </Text>
                  <Text className="mt-0.5 text-xs text-stone-500">
                    {item.user.email}
                    {item.store?.city ? ` · ${item.store.city}` : ''}
                  </Text>
                </View>
                <View
                  className={`rounded-full px-2.5 py-1 ${
                    !item.store
                      ? 'bg-stone-100'
                      : approved
                        ? 'bg-green-50'
                        : 'bg-amber-50'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      !item.store
                        ? 'text-stone-500'
                        : approved
                          ? 'text-green-700'
                          : 'text-amber-700'
                    }`}
                  >
                    {!item.store
                      ? 'Mağaza yok'
                      : approved
                        ? 'Onaylı'
                        : 'Bekliyor'}
                  </Text>
                </View>
              </View>

              <View className="mt-3 flex-row flex-wrap gap-2">
                <Chip
                  icon="cube-outline"
                  label={`${item.productCount} ürün`}
                />
                <Chip icon="layers-outline" label={`${item.stockTotal} stok`} />
                <Chip
                  icon="star-outline"
                  label={
                    item.ratingCount
                      ? `${item.ratingAverage} (${item.ratingCount})`
                      : 'Puan yok'
                  }
                />
                <Chip icon="receipt-outline" label={`${item.orderCount} sipariş`} />
                {item.unsettledCommission > 0 ? (
                  <Chip
                    icon="cash-outline"
                    label={`${money(item.unsettledCommission)} bekleyen`}
                    hot
                  />
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
    );
  }

  return (
    <FlatList
      className="flex-1 bg-[#FFF8F3]"
      data={buyers}
      keyExtractor={(item) => item.id}
      contentContainerClassName="px-4 py-3 pb-10"
      ListHeaderComponent={header}
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
      ListEmptyComponent={
        <Text className="mt-8 text-center text-sm text-stone-500">
          Kayıtlı alıcı yok.
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          className="mb-3 rounded-3xl border border-stone-200 bg-white p-4"
          style={ui.shadow}
          onPress={() =>
            navigation.navigate('BuyerAdminDetail', { userId: item.id })
          }
        >
          <Text className="text-base font-bold text-stone-900">
            {item.full_name || 'İsimsiz alıcı'}
          </Text>
          <Text className="mt-0.5 text-xs text-stone-500">{item.email}</Text>
          {item.phone ? (
            <Text className="mt-1 text-xs text-stone-400">{item.phone}</Text>
          ) : null}
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Chip icon="bag-handle-outline" label={`${item.orderCount} sipariş`} />
            <Chip
              icon="checkmark-done-outline"
              label={`${item.deliveredCount} teslim`}
            />
            <Chip icon="wallet-outline" label={money(item.spendTotal)} />
          </View>
        </Pressable>
      )}
    />
  );
}

function Chip({
  icon,
  label,
  hot,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hot?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center rounded-full px-2.5 py-1 ${
        hot ? 'bg-amber-50' : 'bg-stone-100'
      }`}
    >
      <Ionicons name={icon} size={12} color={hot ? '#d97706' : '#57534e'} />
      <Text
        className={`ml-1 text-[11px] font-semibold ${
          hot ? 'text-amber-800' : 'text-stone-600'
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

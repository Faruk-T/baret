import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { getMonthlyFinance, type MonthFinance } from '../../services/adminOps';
import { toCsv } from '../../utils/csv';
import { ui } from '../../theme/ui';

function money(n: number): string {
  return `₺${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
}

export function FinanceSummaryScreen() {
  const [rows, setRows] = useState<MonthFinance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows(await getMonthlyFinance(6));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Finans özeti yüklenemedi.');
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

  const exportCsv = () => {
    const csv = toCsv(
      ['Ay', 'Sipariş', 'İptal%', 'Ciro', 'Komisyon', 'Bekleyen', 'Alınan'],
      rows.map((r) => [
        r.label,
        r.orderCount,
        r.cancelRate,
        r.grossAmount,
        r.commissionAmount,
        r.unsettledAmount,
        r.collectedAmount,
      ])
    );
    void Share.share({ message: csv, title: 'baret-finans.csv' });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator color={ui.brand} />
      </View>
    );
  }

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
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-bold text-stone-900">Finans özeti</Text>
          <Text className="mt-1 text-sm text-stone-500">Son 6 ay · tahsilat dengesi</Text>
        </View>
        <Pressable
          className="rounded-xl bg-brand px-3 py-2"
          onPress={exportCsv}
        >
          <Text className="text-xs font-bold text-white">CSV</Text>
        </Pressable>
      </View>

      {error ? <Text className="mb-3 text-sm text-red-600">{error}</Text> : null}

      {rows.map((r) => (
        <View
          key={r.monthKey}
          className="mb-3 rounded-3xl border border-stone-200 bg-white p-4"
        >
          <Text className="text-lg font-bold capitalize text-stone-900">
            {r.label}
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Pill label="Sipariş" value={String(r.orderCount)} />
            <Pill label="İptal" value={`%${r.cancelRate}`} />
            <Pill label="Ciro" value={money(r.grossAmount)} />
            <Pill label="Komisyon" value={money(r.commissionAmount)} />
            <Pill label="Bekleyen" value={money(r.unsettledAmount)} hot />
            <Pill label="Alınan" value={money(r.collectedAmount)} ok />
          </View>
          {r.topStores.length > 0 ? (
            <View className="mt-3 border-t border-stone-100 pt-3">
              <Text className="mb-1 text-xs font-bold uppercase text-stone-500">
                Top satıcılar
              </Text>
              {r.topStores.map((s) => (
                <Text key={s.storeId} className="text-sm text-stone-700">
                  {s.name} · {money(s.commission)}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

function Pill({
  label,
  value,
  hot,
  ok,
}: {
  label: string;
  value: string;
  hot?: boolean;
  ok?: boolean;
}) {
  return (
    <View
      className={`rounded-2xl px-3 py-2 ${
        hot ? 'bg-amber-50' : ok ? 'bg-green-50' : 'bg-stone-100'
      }`}
    >
      <Text className="text-[10px] font-bold uppercase text-stone-500">{label}</Text>
      <Text
        className={`text-sm font-bold ${
          hot ? 'text-amber-800' : ok ? 'text-green-800' : 'text-stone-900'
        }`}
      >
        {value}
      </Text>
    </View>
  );
}

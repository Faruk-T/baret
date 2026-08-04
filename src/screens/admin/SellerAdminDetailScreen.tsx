import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { listSellersAdmin } from '../../services/adminPeople';
import { writeAuditLog } from '../../services/adminOps';
import {
  assignStoreSubscription,
  getStorePlanUsage,
  listSellerPlans,
  type EffectivePlan,
} from '../../services/plans';
import {
  approveStore,
  rejectStore,
  unapproveStore,
} from '../../services/stores';
import type { SellerPlan } from '../../types/database';
import type { AdminStackParamList } from '../../types/navigation.types';
import { ui } from '../../theme/ui';

type Props = NativeStackScreenProps<AdminStackParamList, 'SellerAdminDetail'>;

function money(value: number): string {
  return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

export function SellerAdminDetailScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const { userId } = route.params;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [row, setRow] = useState<
    Awaited<ReturnType<typeof listSellersAdmin>>[number] | null
  >(null);
  const [plans, setPlans] = useState<SellerPlan[]>([]);
  const [usage, setUsage] = useState<EffectivePlan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [months, setMonths] = useState('1');
  const [customMax, setCustomMax] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  const load = useCallback(async () => {
    try {
      const [all, planRows] = await Promise.all([
        listSellersAdmin(),
        listSellerPlans(true).catch(() => [] as SellerPlan[]),
      ]);
      const found = all.find((s) => s.user.id === userId) ?? null;
      setRow(found);
      setPlans(planRows);
      if (found?.store?.id) {
        const u = await getStorePlanUsage(found.store.id).catch(() => null);
        setUsage(u);
        if (u?.plan?.id) setSelectedPlanId(u.plan.id);
        else if (planRows[0]) setSelectedPlanId(planRows[0].id);
      }
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
        <View className="mt-4 rounded-3xl border border-stone-200 bg-white p-4">
          <Text className="text-xs font-bold uppercase text-stone-500">
            Abonelik planı
          </Text>
          {usage?.isActive ? (
            <Text className="mt-2 text-sm text-stone-700">
              Aktif: {usage.plan?.name ?? 'Plan'} · {usage.productCount}/
              {usage.maxProducts} ürün · {money(usage.priceMonthly)}/ay
              {usage.endsAt
                ? `\nBitiş: ${new Date(usage.endsAt).toLocaleDateString('tr-TR')}`
                : ''}
            </Text>
          ) : (
            <Text className="mt-2 text-sm text-amber-800">
              Aktif plan yok — ürün ekleyemez.
            </Text>
          )}

          <Text className="mb-2 mt-3 text-xs font-semibold text-stone-500">
            Plan seç
          </Text>
          <View className="flex-row flex-wrap">
            {plans.map((p) => {
              const selected = selectedPlanId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedPlanId(p.id)}
                  className={`mb-2 mr-2 rounded-xl border px-3 py-2 ${
                    selected
                      ? 'border-brand bg-orange-50'
                      : 'border-stone-200 bg-stone-50'
                  }`}
                >
                  <Text
                    className={`text-sm font-bold ${
                      selected ? 'text-brand' : 'text-stone-700'
                    }`}
                  >
                    {p.name}
                  </Text>
                  <Text className="text-[10px] text-stone-400">
                    {p.max_products} ürün · {money(Number(p.price_monthly))}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-2 flex-row gap-2">
            <View className="flex-1">
              <Text className="mb-1 text-xs text-stone-500">Süre (ay)</Text>
              <TextInput
                className="rounded-xl border border-stone-200 bg-[#FFF8F3] px-3 py-2 text-stone-900"
                keyboardType="number-pad"
                value={months}
                onChangeText={setMonths}
              />
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-xs text-stone-500">Özel max ürün</Text>
              <TextInput
                className="rounded-xl border border-stone-200 bg-[#FFF8F3] px-3 py-2 text-stone-900"
                keyboardType="number-pad"
                placeholder="opsiyonel"
                placeholderTextColor="#a8a29e"
                value={customMax}
                onChangeText={setCustomMax}
              />
            </View>
          </View>
          <Text className="mb-1 mt-2 text-xs text-stone-500">
            Özel aylık ücret (₺) — Özel plan için
          </Text>
          <TextInput
            className="rounded-xl border border-stone-200 bg-[#FFF8F3] px-3 py-2 text-stone-900"
            keyboardType="decimal-pad"
            placeholder="opsiyonel"
            placeholderTextColor="#a8a29e"
            value={customPrice}
            onChangeText={setCustomPrice}
          />

          <Pressable
            className={`mt-3 items-center rounded-2xl bg-stone-900 py-3 ${
              busy ? 'opacity-50' : ''
            }`}
            disabled={busy}
            onPress={() => {
              if (!user?.id || !selectedPlanId) return;
              const m = Number.parseInt(months, 10);
              void run(async () => {
                await assignStoreSubscription({
                  storeId: store.id,
                  planId: selectedPlanId,
                  months: Number.isFinite(m) ? m : 1,
                  customMaxProducts: customMax.trim()
                    ? Number.parseInt(customMax, 10)
                    : null,
                  customPriceMonthly: customPrice.trim()
                    ? Number(customPrice.replace(',', '.'))
                    : null,
                  adminId: user.id,
                });
                await writeAuditLog({
                  actorId: user.id,
                  action: 'subscription.assign',
                  entityType: 'store',
                  entityId: store.id,
                  meta: { planId: selectedPlanId, months: m },
                });
              }, 'Abonelik atandı.');
            }}
          >
            <Text className="font-bold text-white">Planı uygula / yenile</Text>
          </Pressable>
        </View>
      ) : null}

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
            label="Bildirim gönder"
            icon="notifications-outline"
            variant="muted"
            onPress={() => navigation.navigate('NotificationsCenter')}
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

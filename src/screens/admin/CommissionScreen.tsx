import { useCallback, useMemo, useState, type ReactNode } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../context/AuthContext';
import {
  getCommissionSummary,
  getPlatformSettings,
  listStoreCommissionSummaries,
  previewCommission,
  updateCommissionSettings,
  type CommissionSummary,
  type StoreCommissionRow,
} from '../../services/commission';
import type { PlatformSettings } from '../../types/database';
import type { AdminStackParamList } from '../../types/navigation.types';

function money(value: number): string {
  return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

function parseNum(value: string): number {
  return Number(value.replace(',', '.'));
}

export function CommissionScreen() {
  const { user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<AdminStackParamList, 'Commission'>>();
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [storeRows, setStoreRows] = useState<StoreCommissionRow[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  const [flatRate, setFlatRate] = useState('10');
  const [exampleAmount, setExampleAmount] = useState('50');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(
    () => previewCommission(parseNum(exampleAmount) || 0, parseNum(flatRate) || 0),
    [exampleAmount, flatRate]
  );

  const load = useCallback(async () => {
    try {
      setError(null);
      const [data, cfg, stores] = await Promise.all([
        getCommissionSummary(),
        getPlatformSettings(),
        listStoreCommissionSummaries().catch(() => [] as StoreCommissionRow[]),
      ]);
      setSummary(data);
      setStoreRows(stores);
      setSettings(cfg);
      setFlatRate(String(cfg.commission_rate ?? cfg.tier1_rate ?? 10));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Komisyon verisi yüklenemedi. SQL kurulumunu kontrol et.'
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

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      setSaving(true);
      await updateCommissionSettings({ rate: parseNum(flatRate) }, user.id);
      await load();
      Alert.alert(
        'Kaydedildi',
        `Sabit %${parseNum(flatRate)} komisyon yeni siparişlere uygulanır.`
      );
    } catch (e) {
      Alert.alert(
        'Hata',
        e instanceof Error ? e.message : 'Ayarlar kaydedilemedi.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator color="#FF6B00" />
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
          tintColor="#FF6B00"
        />
      }
      keyboardShouldPersistTaps="handled"
    >
      <LinearGradient
        colors={['#FF8A3D', '#FF6B00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 20, padding: 18, marginBottom: 16 }}
      >
        <Text className="text-xs font-bold uppercase tracking-wider text-orange-100">
          Platform payı
        </Text>
        <Text className="mt-1 text-2xl font-bold text-white">Komisyon & tahsilat</Text>
        <Text className="mt-2 text-sm leading-5 text-orange-50">
          Her nalburun borcu ayrı. Tahsil ettiğinde onayla — ne kadar / ne zaman
          aldığını kaydet.
        </Text>
      </LinearGradient>

      <View className="mb-5">
        <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">
          Satıcı bazlı tahsilat
        </Text>
        {storeRows.length === 0 ? (
          <View className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-5">
            <Text className="text-center text-sm text-stone-500">
              Henüz komisyon satırı yok. SQL kurulumu:{' '}
              docs/admin-commission-collections-setup.sql
            </Text>
          </View>
        ) : (
          storeRows.map((row) => (
            <Pressable
              key={row.storeId}
              className="mb-2 rounded-2xl border border-stone-200 bg-white px-4 py-3"
              onPress={() =>
                navigation.navigate('StoreCommissionDetail', {
                  storeId: row.storeId,
                  storeName: row.storeName,
                })
              }
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <Text className="font-bold text-stone-900">{row.storeName}</Text>
                  <Text className="mt-0.5 text-xs text-stone-500">
                    {row.city} · {row.orderCount} sipariş
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#a8a29e" />
              </View>
              <View className="mt-3 flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-[10px] font-bold uppercase text-amber-700">
                    Bekleyen
                  </Text>
                  <Text className="text-base font-bold text-amber-800">
                    {money(row.unsettledAmount)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold uppercase text-green-700">
                    Alınan
                  </Text>
                  <Text className="text-base font-bold text-green-800">
                    {money(row.collectedAmount)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold uppercase text-stone-500">
                    Toplam
                  </Text>
                  <Text className="text-base font-bold text-stone-900">
                    {money(row.commissionAmount)}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">
        Oran ayarları
      </Text>

      {error ? (
        <View className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <Text className="text-sm text-red-700">{error}</Text>
        </View>
      ) : null}

      {summary ? (
        <View className="mb-4 flex-row gap-2">
          <StatCard
            label="Brüt ciro"
            value={money(summary.grossAmount)}
            icon="cash-outline"
          />
          <StatCard
            label="Platform"
            value={money(summary.commissionAmount)}
            icon="pie-chart-outline"
            emphasize
          />
          <StatCard
            label="Satıcı net"
            value={money(summary.sellerNetAmount)}
            icon="storefront-outline"
          />
        </View>
      ) : null}

      <Section
        title="1 · Sabit oran"
        subtitle="Her sipariş satırında aynı yüzde — dilim / teşvik yok"
      >
        <Field
          label="Komisyon oranı (%)"
          value={flatRate}
          onChangeText={setFlatRate}
          hint="Örn. %10 → 20 ₺ siparişte platform payı 2 ₺, 500 ₺ siparişte 50 ₺."
        />
      </Section>

      <Section title="2 · Canlı örnek" subtitle="Kaydetmeden önce dene">
        <Field
          label="Örnek sipariş tutarı (₺)"
          value={exampleAmount}
          onChangeText={setExampleAmount}
        />
        <View className="rounded-2xl border border-orange-200 bg-white p-4">
          <Text className="text-xs font-semibold uppercase text-stone-500">
            Sonuç
          </Text>
          <Text className="mt-1 text-base font-bold text-stone-900">
            {preview.tierLabel}
          </Text>
          <View className="mt-3 flex-row justify-between">
            <Text className="text-sm text-stone-600">Uygulanan oran</Text>
            <Text className="text-sm font-semibold text-stone-900">
              %{preview.rate.toLocaleString('tr-TR')}
            </Text>
          </View>
          <View className="mt-1 flex-row justify-between">
            <Text className="text-sm text-stone-600">Platform payı</Text>
            <Text className="text-sm font-bold text-brand">
              {money(preview.commission)}
            </Text>
          </View>
          <View className="mt-1 flex-row justify-between">
            <Text className="text-sm text-stone-600">Satıcı net</Text>
            <Text className="text-sm font-semibold text-stone-900">
              {money(preview.sellerNet)}
            </Text>
          </View>
        </View>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {[20, 50, 150, 500, 2500].map((n) => (
            <Pressable
              key={n}
              onPress={() => setExampleAmount(String(n))}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5"
            >
              <Text className="text-xs font-medium text-stone-700">
                {money(n)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Section>

      {summary ? (
        <View className="mb-4 rounded-2xl border border-stone-200 bg-white px-4 py-3">
          <Text className="mb-2 text-xs font-semibold uppercase text-stone-500">
            Özet kayıtlar
          </Text>
          <Row label="Komisyonlu sipariş" value={String(summary.orderCount)} />
          <Row
            label="Kayıtlı oran"
            value={`%${settings?.commission_rate ?? summary.rate}`}
          />
        </View>
      ) : null}

      <Pressable
        className={`items-center rounded-2xl bg-brand py-4 ${saving ? 'opacity-70' : ''}`}
        disabled={saving}
        onPress={() => void handleSave()}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-bold text-white">Oranı kaydet</Text>
        )}
      </Pressable>
      <Text className="mt-2 text-center text-xs text-stone-500">
        Değişiklik yalnızca yeni siparişlere yansır. Supabase’te
        docs/flat-commission-10.sql çalıştırılmış olmalı.
      </Text>
    </ScrollView>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <View className="mb-4">
      {title ? (
        <Text className="mb-0.5 text-base font-bold text-stone-900">{title}</Text>
      ) : null}
      {subtitle ? (
        <Text className="mb-3 text-xs text-stone-500">{subtitle}</Text>
      ) : null}
      {children}
    </View>
  );
}

function TierCard({
  badge,
  color,
  border,
  title,
  hint,
  children,
}: {
  badge: string;
  color: string;
  border: string;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <View
      className="mb-3 rounded-2xl border bg-white p-4"
      style={{ borderColor: border, backgroundColor: '#fff' }}
    >
      <View className="mb-2 flex-row items-center gap-2">
        <View
          className="rounded-full px-2.5 py-1"
          style={{ backgroundColor: color }}
        >
          <Text className="text-[10px] font-bold uppercase text-stone-800">
            {badge}
          </Text>
        </View>
        <Text className="flex-1 text-sm font-bold text-stone-900">{title}</Text>
      </View>
      <Text className="mb-3 text-xs text-stone-500">{hint}</Text>
      {children}
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  emphasize,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  emphasize?: boolean;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-stone-200 bg-white p-3">
      <Ionicons
        name={icon}
        size={16}
        color={emphasize ? '#FF6B00' : '#78716c'}
      />
      <Text className="mt-2 text-[10px] font-semibold uppercase text-stone-500">
        {label}
      </Text>
      <Text
        className={`mt-0.5 text-xs font-bold ${
          emphasize ? 'text-brand' : 'text-stone-900'
        }`}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  integer,
  hint,
  className,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  integer?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <View className={`mb-3 ${className ?? ''}`}>
      <Text className="mb-1.5 text-xs font-semibold uppercase text-stone-500">
        {label}
      </Text>
      <TextInput
        className="rounded-xl border border-stone-200 bg-[#FFF8F3] px-4 py-3 text-base text-stone-900"
        keyboardType={integer ? 'number-pad' : 'decimal-pad'}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#a8a29e"
      />
      {hint ? (
        <Text className="mt-1 text-[11px] leading-4 text-stone-400">{hint}</Text>
      ) : null}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-1.5 flex-row items-center justify-between">
      <Text className="text-sm text-stone-600">{label}</Text>
      <Text className="text-sm font-semibold text-stone-900">{value}</Text>
    </View>
  );
}

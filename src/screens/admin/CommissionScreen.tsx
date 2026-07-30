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

import { useAuth } from '../../context/AuthContext';
import {
  getCommissionSummary,
  getPlatformSettings,
  updateCommissionSettings,
  type CommissionSummary,
} from '../../services/commission';
import type { PlatformSettings } from '../../types/database';

function money(value: number): string {
  return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

export function CommissionScreen() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [rateInput, setRateInput] = useState('8');
  const [introRateInput, setIntroRateInput] = useState('5');
  const [introLimitInput, setIntroLimitInput] = useState('10');
  const [discountInput, setDiscountInput] = useState('1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [data, cfg] = await Promise.all([
        getCommissionSummary(),
        getPlatformSettings(),
      ]);
      setSummary(data);
      setSettings(cfg);
      setRateInput(String(cfg.commission_rate));
      setIntroRateInput(String(cfg.intro_commission_rate ?? 5));
      setIntroLimitInput(String(cfg.intro_order_limit ?? 10));
      setDiscountInput(String(cfg.high_rating_discount ?? 1));
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
      await updateCommissionSettings(
        {
          commissionRate: Number(rateInput.replace(',', '.')),
          introCommissionRate: Number(introRateInput.replace(',', '.')),
          introOrderLimit: Number.parseInt(introLimitInput, 10),
          highRatingDiscount: Number(discountInput.replace(',', '.')),
        },
        user.id
      );
      await load();
      Alert.alert('Kaydedildi', 'Komisyon ve teşvik ayarları güncellendi.');
    } catch (e) {
      Alert.alert(
        'Hata',
        e instanceof Error ? e.message : 'Oran güncellenemedi.'
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
      contentContainerClassName="px-4 py-4 pb-10"
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
      <Text className="mb-1 text-xl font-bold text-stone-900">Komisyon</Text>
      <Text className="mb-4 text-sm text-stone-500">
        Kaçışı cezalandırmak yerine içeride kalmayı teşvik et: ilk siparişlerde
        düşük oran, yüksek puana indirim.
      </Text>

      {error ? (
        <Text className="mb-4 text-sm text-red-600">{error}</Text>
      ) : null}

      <View className="mb-4 rounded-2xl border border-stone-200 bg-white p-4">
        <Field
          label="Standart oran (%)"
          value={rateInput}
          onChangeText={setRateInput}
        />
        <Field
          label="İlk siparişler oranı (%)"
          value={introRateInput}
          onChangeText={setIntroRateInput}
        />
        <Field
          label="İlk sipariş limiti (adet)"
          value={introLimitInput}
          onChangeText={setIntroLimitInput}
          integer
        />
        <Field
          label="Yüksek puan indirimi (puan ≥4.5, ≥5 yorum)"
          value={discountInput}
          onChangeText={setDiscountInput}
        />
        <Pressable
          className={`items-center rounded-xl bg-brand py-3 ${
            saving ? 'opacity-70' : ''
          }`}
          disabled={saving}
          onPress={() => void handleSave()}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-semibold text-white">Ayarları kaydet</Text>
          )}
        </Pressable>
      </View>

      {summary ? (
        <View className="rounded-2xl border border-stone-200 bg-white p-4">
          <Text className="mb-3 text-xs font-semibold uppercase text-stone-500">
            Aktif komisyon kayıtları
          </Text>
          <Row label="Standart oran" value={`%${settings?.commission_rate ?? summary.rate}`} />
          <Row
            label="İlk N sipariş"
            value={`%${settings?.intro_commission_rate ?? 5} · ${settings?.intro_order_limit ?? 10} adet`}
          />
          <Row label="Sipariş (komisyonlu)" value={String(summary.orderCount)} />
          <Row label="Brüt ciro" value={money(summary.grossAmount)} />
          <Row
            label="Platform komisyonu"
            value={money(summary.commissionAmount)}
            emphasize
          />
          <Row label="Satıcı net toplam" value={money(summary.sellerNetAmount)} />
        </View>
      ) : null}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  integer,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  integer?: boolean;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-2 text-xs font-semibold uppercase text-stone-500">
        {label}
      </Text>
      <TextInput
        className="rounded-xl border border-stone-200 bg-[#FFF8F3] px-4 py-3 text-base text-stone-900"
        keyboardType={integer ? 'number-pad' : 'decimal-pad'}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#a8a29e"
      />
    </View>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="mr-2 flex-1 text-sm text-stone-600">{label}</Text>
      <Text
        className={`text-sm font-semibold ${
          emphasize ? 'text-brand' : 'text-stone-900'
        }`}
      >
        {value}
      </Text>
    </View>
  );
}

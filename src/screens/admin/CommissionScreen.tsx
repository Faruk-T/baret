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
  updateCommissionRate,
  type CommissionSummary,
} from '../../services/commission';

function money(value: number): string {
  return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

export function CommissionScreen() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [rateInput, setRateInput] = useState('8');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getCommissionSummary();
      setSummary(data);
      setRateInput(String(data.rate));
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
    const rate = Number(rateInput.replace(',', '.'));
    try {
      setSaving(true);
      await updateCommissionRate(rate, user.id);
      await load();
      Alert.alert('Kaydedildi', `Yeni komisyon oranı: %${rate}`);
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
        Sipariş tutarı üzerinden platform payı. Oran değişince sadece yeni siparişler etkilenir.
      </Text>

      {error ? (
        <Text className="mb-4 text-sm text-red-600">{error}</Text>
      ) : null}

      <View className="mb-4 rounded-2xl border border-stone-200 bg-white p-4">
        <Text className="mb-2 text-xs font-semibold uppercase text-stone-500">
          Oran (%)
        </Text>
        <TextInput
          className="mb-3 rounded-xl border border-stone-200 bg-[#FFF8F3] px-4 py-3 text-base text-stone-900"
          keyboardType="decimal-pad"
          value={rateInput}
          onChangeText={setRateInput}
          placeholder="8"
          placeholderTextColor="#a8a29e"
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
            <Text className="font-semibold text-white">Oranı kaydet</Text>
          )}
        </Pressable>
      </View>

      {summary ? (
        <View className="rounded-2xl border border-stone-200 bg-white p-4">
          <Text className="mb-3 text-xs font-semibold uppercase text-stone-500">
            Aktif komisyon kayıtları
          </Text>
          <Row label="Geçerli oran" value={`%${summary.rate}`} />
          <Row label="Sipariş (komisyonlu)" value={String(summary.orderCount)} />
          <Row label="Brüt ciro" value={money(summary.grossAmount)} />
          <Row
            label="Platform komisyonu"
            value={money(summary.commissionAmount)}
            emphasize
          />
          <Row label="Satıcı net toplam" value={money(summary.sellerNetAmount)} />
          <Text className="mt-3 text-xs text-stone-400">
            İptal edilen siparişlerin komisyonu silinir; bu özet yalnızca aktif kayıtları
            gösterir.
          </Text>
        </View>
      ) : null}
    </ScrollView>
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
      <Text className="text-sm text-stone-600">{label}</Text>
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

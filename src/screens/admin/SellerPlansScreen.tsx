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
import { writeAuditLog } from '../../services/adminOps';
import {
  listSellerPlans,
  updateSellerPlan,
} from '../../services/plans';
import type { SellerPlan } from '../../types/database';
import { ui } from '../../theme/ui';

function money(n: number): string {
  return `₺${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
}

export function SellerPlansScreen() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SellerPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { max: string; price: string; name: string; description: string }>
  >({});

  const load = useCallback(async () => {
    try {
      const rows = await listSellerPlans(true);
      setPlans(rows);
      const next: typeof drafts = {};
      for (const p of rows) {
        next[p.id] = {
          max: String(p.max_products),
          price: String(p.price_monthly),
          name: p.name,
          description: p.description ?? '',
        };
      }
      setDrafts(next);
    } catch (e) {
      Alert.alert(
        'Hata',
        e instanceof Error
          ? e.message
          : 'Planlar yüklenemedi. docs/seller-plans-setup.sql çalıştır.'
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

  const save = async (plan: SellerPlan) => {
    const d = drafts[plan.id];
    if (!d || !user?.id) return;
    const max = Number(d.max.replace(',', '.'));
    const price = Number(d.price.replace(',', '.'));
    if (!Number.isFinite(max) || max < 1) {
      Alert.alert('Kapasite', 'Ürün limiti 1 veya üzeri olmalı.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      Alert.alert('Fiyat', 'Aylık ücret 0 veya üzeri olmalı.');
      return;
    }
    try {
      setSavingId(plan.id);
      await updateSellerPlan(plan.id, {
        name: d.name.trim() || plan.name,
        description: d.description.trim() || null,
        max_products: Math.floor(max),
        price_monthly: Math.round(price * 100) / 100,
      });
      await writeAuditLog({
        actorId: user.id,
        action: 'plan.update',
        entityType: 'seller_plan',
        entityId: plan.id,
        meta: { max, price },
      });
      await load();
      Alert.alert('Kaydedildi', `${plan.code.toUpperCase()} planı güncellendi.`);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSavingId(null);
    }
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
      keyboardShouldPersistTaps="handled"
    >
      <Text className="mb-1 text-2xl font-bold text-stone-900">Satıcı planları</Text>
      <Text className="mb-4 text-sm text-stone-500">
        Komisyon yok — aylık ürün kapasitesi. Basic / Pro şablon; Özel planda mağaza
        bazlı kapasite ve fiyat satıcı detayından atanır.
      </Text>

      {plans.map((plan) => {
        const d = drafts[plan.id] ?? {
          max: '',
          price: '',
          name: plan.name,
          description: '',
        };
        return (
          <View
            key={plan.id}
            className="mb-4 rounded-3xl border border-stone-200 bg-white p-4"
          >
            <Text className="text-xs font-bold uppercase tracking-wide text-brand">
              {plan.code}
            </Text>
            <TextInput
              className="mt-2 rounded-xl border border-stone-200 bg-[#FFF8F3] px-3 py-2.5 text-base font-bold text-stone-900"
              value={d.name}
              onChangeText={(t) =>
                setDrafts((prev) => ({ ...prev, [plan.id]: { ...d, name: t } }))
              }
            />
            <TextInput
              className="mt-2 rounded-xl border border-stone-200 bg-[#FFF8F3] px-3 py-2.5 text-sm text-stone-800"
              value={d.description}
              onChangeText={(t) =>
                setDrafts((prev) => ({
                  ...prev,
                  [plan.id]: { ...d, description: t },
                }))
              }
              multiline
            />
            <View className="mt-3 flex-row gap-2">
              <View className="flex-1">
                <Text className="mb-1 text-xs font-semibold text-stone-500">
                  Max ürün
                </Text>
                <TextInput
                  className="rounded-xl border border-stone-200 bg-[#FFF8F3] px-3 py-2.5 text-stone-900"
                  keyboardType="number-pad"
                  value={d.max}
                  onChangeText={(t) =>
                    setDrafts((prev) => ({ ...prev, [plan.id]: { ...d, max: t } }))
                  }
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-xs font-semibold text-stone-500">
                  Aylık (₺)
                </Text>
                <TextInput
                  className="rounded-xl border border-stone-200 bg-[#FFF8F3] px-3 py-2.5 text-stone-900"
                  keyboardType="decimal-pad"
                  value={d.price}
                  onChangeText={(t) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [plan.id]: { ...d, price: t },
                    }))
                  }
                />
              </View>
            </View>
            <Text className="mt-2 text-xs text-stone-400">
              Varsayılan özet: {plan.max_products} ürün · {money(Number(plan.price_monthly))}
              /ay
            </Text>
            <Pressable
              className={`mt-3 items-center rounded-2xl bg-brand py-3 ${
                savingId === plan.id ? 'opacity-60' : ''
              }`}
              disabled={savingId === plan.id}
              onPress={() => void save(plan)}
            >
              {savingId === plan.id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-bold text-white">Planı kaydet</Text>
              )}
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

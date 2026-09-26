import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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

import { useAuth } from '../../context/AuthContext';
import {
  assignStoreSubscription,
  cancelStoreSubscriptionAdmin,
  listAllStoreSubscriptionsAdmin,
  listSellerPlans,
  type AdminSubscriptionItem,
} from '../../services/plans';
import type { SellerPlan } from '../../types/database';
import type { AdminStackParamList } from '../../types/navigation.types';
import { ui } from '../../theme/ui';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'AdminSubscriptions'>;

function money(val: number): string {
  return `₺${val.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
}

export function AdminSubscriptionsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [items, setItems] = useState<AdminSubscriptionItem[]>([]);
  const [plans, setPlans] = useState<SellerPlan[]>([]);
  const [totalMrr, setTotalMrr] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  // Modal State for renewing/changing subscription
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AdminSubscriptionItem | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [months, setMonths] = useState('1');
  const [customQuota, setCustomQuota] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [res, planList] = await Promise.all([
        listAllStoreSubscriptionsAdmin(),
        listSellerPlans(true),
      ]);
      setItems(res.items);
      setTotalMrr(res.totalActiveMrr);
      setActiveCount(res.activeCount);
      setExpiredCount(res.expiredCount);
      setPlans(planList);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Abonelikler yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadData();
    }, [loadData])
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter === 'active' && item.isExpired) return false;
      if (statusFilter === 'expired' && !item.isExpired) return false;
      if (planFilter !== 'all' && item.planCode !== planFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = item.storeName.toLowerCase().includes(q);
        const matchesCity = item.storeCity.toLowerCase().includes(q);
        if (!matchesName && !matchesCity) return false;
      }
      return true;
    });
  }, [items, statusFilter, planFilter, search]);

  const openManageModal = (item: AdminSubscriptionItem) => {
    setSelectedItem(item);
    const currentPlan = plans.find((p) => p.code === item.planCode) ?? plans[0];
    setSelectedPlanId(currentPlan?.id ?? '');
    setMonths('1');
    setCustomQuota(item.planCode === 'custom' ? String(item.maxProducts) : '');
    setCustomPrice(item.planCode === 'custom' ? String(item.priceMonthly) : '');
    setNote('');
    setModalVisible(true);
  };

  const handleSaveSubscription = async () => {
    if (!selectedItem || !selectedPlanId || !user) return;
    const m = parseInt(months, 10);
    if (isNaN(m) || m < 1) {
      Alert.alert('Geçersiz Süre', 'Lütfen en az 1 ay belirtin.');
      return;
    }

    try {
      setSaving(true);
      await assignStoreSubscription({
        storeId: selectedItem.storeId,
        planId: selectedPlanId,
        months: m,
        customMaxProducts: customQuota.trim() ? parseInt(customQuota, 10) : undefined,
        customPriceMonthly: customPrice.trim() ? parseFloat(customPrice.replace(',', '.')) : undefined,
        note: note.trim() || undefined,
        adminId: user.id,
      });

      Alert.alert('Başarılı', `${selectedItem.storeName} için abonelik güncellendi.`);
      setModalVisible(false);
      void loadData();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Plan atanamadı.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSubscription = (item: AdminSubscriptionItem) => {
    if (!user) return;
    Alert.alert(
      'Aboneliği İptal Et',
      `${item.storeName} mağazasının aboneliğini iptal etmek istediğinize emin misiniz? Ürün yükleme yetkisi kısıtlanacaktır.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelStoreSubscriptionAdmin(item.id, user.id);
              Alert.alert('İptal Edildi', 'Abonelik iptal edildi.');
              void loadData();
            } catch (e) {
              Alert.alert('Hata', e instanceof Error ? e.message : 'İşlem başarısız.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator size="large" color={ui.brand} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FFF8F3]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-12"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadData();
            }}
            tintColor={ui.brand}
          />
        }
      >
        {/* Header Summary Cards */}
        <View className="mb-4 flex-row gap-2">
          <View className="flex-1 rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Aylık Sabit Gelir
            </Text>
            <Text className="mt-1 text-xl font-black text-brand">
              {money(totalMrr)}
            </Text>
            <Text className="text-[10px] text-stone-400">Canlı MRR</Text>
          </View>

          <View className="flex-1 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-sm">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Aktif Abonelik
            </Text>
            <Text className="mt-1 text-xl font-black text-emerald-800">
              {activeCount}
            </Text>
            <Text className="text-[10px] text-emerald-600">Nalbur mağazası</Text>
          </View>

          <View className="flex-1 rounded-2xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-sm">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              Süresi Dolan
            </Text>
            <Text className="mt-1 text-xl font-black text-rose-800">
              {expiredCount}
            </Text>
            <Text className="text-[10px] text-rose-600">Yenileme bekleyen</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View className="mb-3 flex-row items-center rounded-2xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm">
          <Ionicons name="search" size={18} color="#78716c" />
          <TextInput
            className="ml-2 flex-1 text-sm text-stone-900"
            placeholder="Mağaza adı veya şehir ile ara..."
            placeholderTextColor="#a8a29e"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#a8a29e" />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Pills */}
        <View className="mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            <FilterChip
              label="Tümü"
              active={statusFilter === 'all'}
              onPress={() => setStatusFilter('all')}
            />
            <FilterChip
              label={`Aktif (${activeCount})`}
              active={statusFilter === 'active'}
              onPress={() => setStatusFilter('active')}
            />
            <FilterChip
              label={`Süresi Dolan (${expiredCount})`}
              active={statusFilter === 'expired'}
              onPress={() => setStatusFilter('expired')}
            />
            <View className="mx-1 h-5 self-center border-r border-stone-300" />
            <FilterChip
              label="Tüm Planlar"
              active={planFilter === 'all'}
              onPress={() => setPlanFilter('all')}
            />
            <FilterChip
              label="Basic"
              active={planFilter === 'basic'}
              onPress={() => setPlanFilter('basic')}
            />
            <FilterChip
              label="Pro"
              active={planFilter === 'pro'}
              onPress={() => setPlanFilter('pro')}
            />
            <FilterChip
              label="Özel"
              active={planFilter === 'custom'}
              onPress={() => setPlanFilter('custom')}
            />
          </ScrollView>
        </View>

        {/* Subscriptions List */}
        {filteredItems.length === 0 ? (
          <View className="my-8 items-center justify-center p-6 text-center">
            <Ionicons name="pricetags-outline" size={48} color="#d6d3d1" />
            <Text className="mt-3 text-base font-bold text-stone-700">Abonelik Bulunamadı</Text>
            <Text className="mt-1 text-center text-xs text-stone-500">
              Seçili filtrelere uygun mağaza aboneliği bulunamadı.
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => {
            const usagePercent =
              item.maxProducts > 0
                ? Math.min(100, Math.round((item.productCount / item.maxProducts) * 100))
                : 0;

            const isNearLimit = usagePercent >= 85;

            return (
              <View
                key={item.id}
                className="mb-3.5 overflow-hidden rounded-3xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                {/* Store Info & Status */}
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-base font-bold text-stone-900" numberOfLines={1}>
                        {item.storeName}
                      </Text>
                      {item.storeIsApproved ? (
                        <Ionicons name="checkmark-circle" size={16} color="#059669" />
                      ) : null}
                    </View>
                    <Text className="text-xs text-stone-500">
                      {item.storeCity}
                      {item.storeDistrict ? ` / ${item.storeDistrict}` : ''} · {item.storePhone}
                    </Text>
                  </View>

                  <View className="items-end">
                    <PlanBadge planCode={item.planCode} planName={item.planName} />
                    <Text className="mt-1 text-xs font-black text-brand">
                      {money(item.priceMonthly)} <Text className="font-normal text-stone-400">/ ay</Text>
                    </Text>
                  </View>
                </View>

                {/* Quota Usage Bar */}
                <View className="mt-3.5 rounded-2xl bg-stone-50 p-2.5">
                  <View className="flex-row justify-between text-xs">
                    <Text className="text-xs font-medium text-stone-600">Ürün Kapasitesi</Text>
                    <Text className="text-xs font-bold text-stone-800">
                      {item.productCount} / {item.maxProducts} ürün (%{usagePercent})
                    </Text>
                  </View>
                  <View className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-200">
                    <View
                      className={`h-full rounded-full ${
                        isNearLimit ? 'bg-amber-500' : 'bg-brand'
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </View>
                </View>

                {/* Expiry & Remaining Days */}
                <View className="mt-3 flex-row items-center justify-between border-t border-stone-100 pt-2.5">
                  <View className="flex-row items-center gap-1">
                    <Ionicons
                      name="time-outline"
                      size={15}
                      color={item.isExpired ? '#dc2626' : item.remainingDays <= 7 ? '#d97706' : '#059669'}
                    />
                    <Text
                      className={`text-xs font-bold ${
                        item.isExpired
                          ? 'text-red-600'
                          : item.remainingDays <= 7
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {item.isExpired
                        ? 'Süresi Doldu'
                        : `${item.remainingDays} gün kaldı (${new Date(item.endsAt).toLocaleDateString('tr-TR')})`}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <Pressable
                      className="rounded-xl border border-stone-200 bg-white px-3 py-1.5"
                      onPress={() => openManageModal(item)}
                    >
                      <Text className="text-xs font-bold text-stone-700">Planı Yönet</Text>
                    </Pressable>

                    {!item.isExpired ? (
                      <Pressable
                        className="rounded-xl bg-red-50 p-1.5"
                        onPress={() => handleCancelSubscription(item)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#dc2626" />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Subscription Management Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/60 p-4">
          <View className="max-h-[90%] w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
            <View className="flex-row items-center justify-between border-b border-stone-100 pb-3">
              <View className="flex-1 pr-2">
                <Text className="text-lg font-bold text-stone-900">Abonelik Ata / Yenile</Text>
                <Text className="text-xs text-stone-500" numberOfLines={1}>
                  {selectedItem?.storeName}
                </Text>
              </View>
              <Pressable
                className="rounded-full bg-stone-100 p-1.5"
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#78716c" />
              </Pressable>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              {/* Select Plan */}
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                Plan Seçin
              </Text>
              <View className="mb-4 gap-2">
                {plans.map((p) => {
                  const isSelected = selectedPlanId === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      className={`flex-row items-center justify-between rounded-2xl border p-3 ${
                        isSelected
                          ? 'border-brand bg-orange-50/60'
                          : 'border-stone-200 bg-white'
                      }`}
                      onPress={() => setSelectedPlanId(p.id)}
                    >
                      <View className="flex-1 pr-2">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-sm font-bold text-stone-900">{p.name}</Text>
                          <Text className="text-xs text-stone-500">
                            (Maks {p.max_products} ürün)
                          </Text>
                        </View>
                        <Text className="mt-0.5 text-xs text-stone-500" numberOfLines={2}>
                          {p.description}
                        </Text>
                      </View>
                      <Text className="text-sm font-black text-brand">
                        {money(p.price_monthly)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Duration in Months */}
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                Abonelik Süresi (Ay)
              </Text>
              <View className="mb-4 flex-row gap-2">
                {['1', '3', '6', '12'].map((m) => (
                  <Pressable
                    key={m}
                    className={`flex-1 items-center rounded-xl border py-2.5 ${
                      months === m
                        ? 'border-brand bg-brand text-white'
                        : 'border-stone-200 bg-white'
                    }`}
                    onPress={() => setMonths(m)}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        months === m ? 'text-white' : 'text-stone-700'
                      }`}
                    >
                      {m} Ay
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Custom Overrides (Optional) */}
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                Özel Limit & Fiyat (İsteğe Bağlı)
              </Text>
              <View className="mb-4 flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1 text-[11px] text-stone-500">Maks Ürün</Text>
                  <TextInput
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900"
                    placeholder="Plan varsayılanı"
                    keyboardType="numeric"
                    value={customQuota}
                    onChangeText={setCustomQuota}
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-[11px] text-stone-500">Aylık Fiyat (₺)</Text>
                  <TextInput
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900"
                    placeholder="Plan varsayılanı"
                    keyboardType="numeric"
                    value={customPrice}
                    onChangeText={setCustomPrice}
                  />
                </View>
              </View>

              {/* Note */}
              <Text className="mb-1 text-[11px] text-stone-500">Admin Notu (İsteğe Bağlı)</Text>
              <TextInput
                className="mb-4 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900"
                placeholder="Örn: Yıllık peşin havale yapıldı..."
                value={note}
                onChangeText={setNote}
              />
            </ScrollView>

            {/* Actions */}
            <View className="mt-2 flex-row gap-3 border-t border-stone-100 pt-3">
              <Pressable
                className="flex-1 items-center rounded-2xl border border-stone-200 py-3"
                onPress={() => setModalVisible(false)}
              >
                <Text className="text-sm font-bold text-stone-600">Vazgeç</Text>
              </Pressable>

              <Pressable
                className={`flex-1 items-center rounded-2xl bg-brand py-3 ${
                  saving ? 'opacity-60' : ''
                }`}
                disabled={saving}
                onPress={() => void handleSaveSubscription()}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-sm font-bold text-white">Kaydet ve Onayla</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`mr-2 rounded-full px-3.5 py-1.5 border ${
        active
          ? 'border-brand bg-brand'
          : 'border-stone-200 bg-white'
      }`}
      onPress={onPress}
    >
      <Text
        className={`text-xs font-bold ${
          active ? 'text-white' : 'text-stone-600'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PlanBadge({ planCode, planName }: { planCode: string; planName: string }) {
  let badgeColor = 'bg-stone-100 text-stone-700 border-stone-200';
  if (planCode === 'pro') {
    badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  } else if (planCode === 'custom') {
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (planCode === 'basic') {
    badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
  }

  return (
    <View className={`rounded-xl border px-2.5 py-0.5 ${badgeColor}`}>
      <Text className="text-[11px] font-black uppercase tracking-wider">{planName}</Text>
    </View>
  );
}

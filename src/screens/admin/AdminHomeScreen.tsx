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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../context/AuthContext';
import { getPlatformStats } from '../../services/admin';
import { getTodayPulse } from '../../services/adminOps';
import {
  getCommissionSummary,
  listStoreCommissionSummaries,
} from '../../services/commission';
import { listPendingStores } from '../../services/stores';
import { supabase } from '../../services/supabase';
import type { AdminStackParamList } from '../../types/navigation.types';
import { ui } from '../../theme/ui';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'AdminHome'>;

function money(value: number): string {
  return `₺${value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
}

export function AdminHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user, signOut } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [buyers, setBuyers] = useState(0);
  const [sellers, setSellers] = useState(0);
  const [orders, setOrders] = useState(0);
  const [unsettled, setUnsettled] = useState(0);
  const [platformCut, setPlatformCut] = useState(0);
  const [ordersToday, setOrdersToday] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [openReports, setOpenReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pending, stats, summary, storeRows, pulse] = await Promise.all([
        listPendingStores().catch(() => []),
        getPlatformStats().catch(() => null),
        getCommissionSummary().catch(() => null),
        listStoreCommissionSummaries().catch(() => []),
        getTodayPulse().catch(() => null),
      ]);
      setPendingCount(pending.length);
      if (stats) {
        setBuyers(stats.buyers);
        setSellers(stats.sellers);
        setOrders(stats.orders);
      }
      if (summary) setPlatformCut(summary.commissionAmount);
      setUnsettled(
        storeRows.reduce((sum, row) => sum + row.unsettledAmount, 0)
      );
      if (pulse) {
        setOrdersToday(pulse.ordersToday);
        setRevenueToday(pulse.revenueToday);
        setOpenReports(pulse.openReports);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();

      const channel = supabase
        .channel('admin-home-live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            void load();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'platform_reports' },
          () => {
            void load();
          }
        )
        .subscribe();

      const poll = setInterval(() => {
        void load();
      }, 20000);

      return () => {
        clearInterval(poll);
        void supabase.removeChannel(channel);
      };
    }, [load])
  );

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Çıkış yapılamadı.';
      Alert.alert('Hata', message);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-[#0B1220]"
      contentContainerClassName="pb-12"
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
    >
      <LinearGradient
        colors={['#1a2740', '#0B1220', '#121a2b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 28 }}
      >
        <View className="mb-5 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xs font-bold uppercase tracking-widest text-brand">
              Baret Control
            </Text>
            <Text className="mt-1 text-3xl font-bold text-white">
              {user?.full_name || 'Admin'}
            </Text>
            <Text className="mt-1 text-sm text-stone-400">
              Platformu buradan yönet
            </Text>
          </View>
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand/20">
            <Ionicons name="shield-checkmark" size={28} color="#FF6B00" />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#FF6B00" />
        ) : (
          <View>
            <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">
              Bugün (canlı)
            </Text>
            <View className="mb-3 flex-row flex-wrap justify-between">
              <Kpi
                label="Bugünkü sipariş"
                value={String(ordersToday)}
                tint="#38bdf8"
                onPress={() => navigation.navigate('AdminOrders')}
              />
              <Kpi
                label="Bugünkü ciro"
                value={money(revenueToday)}
                tint="#a3e635"
                onPress={() => navigation.navigate('FinanceSummary')}
              />
              <Kpi
                label="Açık şikayet"
                value={String(openReports)}
                tint="#f87171"
                onPress={() => navigation.navigate('Reports')}
              />
              <Kpi
                label="Eski tahsilat (arşiv)"
                value={money(unsettled)}
                tint="#fb923c"
                onPress={() => navigation.navigate('Commission')}
              />
            </View>
            <View className="flex-row flex-wrap justify-between">
              <Kpi
                label="Bekleyen onay"
                value={String(pendingCount)}
                tint="#fbbf24"
                onPress={() => navigation.navigate('SellerApprovals')}
              />
              <Kpi
                label="Alıcı"
                value={String(buyers)}
                tint="#67e8f9"
                onPress={() => navigation.navigate('PeopleHub')}
              />
              <Kpi
                label="Satıcı"
                value={String(sellers)}
                tint="#bef264"
                onPress={() => navigation.navigate('PeopleHub')}
              />
              <Kpi
                label="Eski komisyon (arşiv)"
                value={money(platformCut)}
                tint="#fda4af"
                onPress={() => navigation.navigate('Commission')}
              />
            </View>
          </View>
        )}
      </LinearGradient>

      <View className="-mt-2 rounded-t-[28px] bg-[#FFF8F3] px-4 pt-6">
        <Text className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500">
          Operasyon
        </Text>

        <MenuCard
          title="Alıcılar & Satıcılar"
          subtitle="Hesaplar, stok, puan, sipariş"
          icon="people"
          onPress={() => navigation.navigate('PeopleHub')}
        />
        <MenuCard
          title="Sipariş merkezi"
          subtitle="Şehir / mağaza / müdahale / CSV"
          icon="receipt"
          onPress={() => navigation.navigate('AdminOrders')}
        />
        <MenuCard
          title="Finans özeti"
          subtitle="Ay bazlı tahsilat ve top satıcılar"
          icon="pie-chart"
          onPress={() => navigation.navigate('FinanceSummary')}
        />
        <MenuCard
          title="Mağaza sağlığı"
          subtitle="Stok · gecikme · puan · şikayet skoru"
          icon="heart"
          onPress={() => navigation.navigate('StoreHealth')}
        />
        <MenuCard
          title="Satıcı onayları"
          subtitle="Kuyruk ve mağaza durumu"
          icon="checkmark-done"
          badge={pendingCount}
          onPress={() => navigation.navigate('SellerApprovals')}
        />
        <MenuCard
          title="Satıcı planları"
          subtitle="Basic / Pro / Özel · ürün kapasitesi"
          icon="pricetags"
          onPress={() => navigation.navigate('SellerPlans')}
        />
        <MenuCard
          title="Lisans anahtarları"
          subtitle="Takvimden bitiş tarihi seç"
          icon="key"
          onPress={() => navigation.navigate('LicenseKeys')}
        />
        <MenuCard
          title="Eski komisyon (arşiv)"
          subtitle="Artık kullanılmıyor — geçmiş kayıt"
          icon="cash"
          onPress={() => navigation.navigate('Commission')}
        />
        <MenuCard
          title="İçerik denetimi"
          subtitle="Ürün kaldır / aç"
          icon="images"
          onPress={() => navigation.navigate('ProductModeration')}
        />
        <MenuCard
          title="Bildirim merkezi"
          subtitle="Satıcıya uygulama içi mesaj"
          icon="notifications"
          onPress={() => navigation.navigate('NotificationsCenter')}
        />
        <MenuCard
          title="Rol yetkileri"
          subtitle="Super / destek / finans"
          icon="shield-checkmark"
          onPress={() => navigation.navigate('AdminRoles')}
        />
        <MenuCard
          title="Şikayetler"
          subtitle="Askıya al · satıcıya git"
          icon="warning"
          badge={openReports}
          onPress={() => navigation.navigate('Reports')}
        />
        <MenuCard
          title="Audit log"
          subtitle="Kim ne yaptı, ne zaman"
          icon="list"
          onPress={() => navigation.navigate('AuditLog')}
        />
        <MenuCard
          title="Platform özeti"
          subtitle={`Toplam sipariş: ${orders}`}
          icon="stats-chart"
          onPress={() => navigation.navigate('PlatformStats')}
        />
        <MenuCard
          title="Hakkında"
          subtitle="Credits · lisanslar · bize ulaşın"
          icon="information-circle"
          onPress={() => navigation.navigate('About')}
        />

        <Pressable
          className={`mt-4 items-center rounded-2xl border border-red-200 bg-red-50 py-3.5 ${
            signingOut ? 'opacity-60' : ''
          }`}
          disabled={signingOut}
          onPress={() => void handleSignOut()}
        >
          {signingOut ? (
            <ActivityIndicator color="#dc2626" />
          ) : (
            <Text className="font-bold text-red-600">Çıkış Yap</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Kpi({
  label,
  value,
  tint,
  onPress,
}: {
  label: string;
  value: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 w-[48%] rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
    >
      <View
        className="mb-2 h-1.5 w-8 rounded-full"
        style={{ backgroundColor: tint }}
      />
      <Text className="text-xl font-bold text-white">{value}</Text>
      <Text className="mt-1 text-[11px] text-stone-400">{label}</Text>
    </Pressable>
  );
}

function MenuCard({
  title,
  subtitle,
  icon,
  onPress,
  badge,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <Pressable
      className="mb-2.5 flex-row items-center rounded-2xl border border-stone-200 bg-white px-3.5 py-3.5"
      style={ui.shadow}
      onPress={onPress}
    >
      <View
        className="mr-3 h-11 w-11 items-center justify-center rounded-2xl"
        style={{ backgroundColor: ui.brandSoft }}
      >
        <Ionicons name={icon} size={20} color={ui.brand} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-stone-900">{title}</Text>
        <Text className="mt-0.5 text-xs text-stone-500">{subtitle}</Text>
      </View>
      {badge && badge > 0 ? (
        <View className="mr-2 rounded-full bg-brand px-2 py-0.5">
          <Text className="text-xs font-bold text-white">{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color="#a8a29e" />
    </Pressable>
  );
}

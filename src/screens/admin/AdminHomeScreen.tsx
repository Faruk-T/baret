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

import { BrandHero } from '../../components/ui/BrandHero';
import { MenuTile } from '../../components/ui/MenuTile';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { listPendingStores } from '../../services/stores';
import type { AdminStackParamList } from '../../types/navigation.types';
import { ui } from '../../theme/ui';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'AdminHome'>;

export function AdminHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user, signOut } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const pending = await listPendingStores();
      setPendingCount(pending.length);
    } catch {
      setPendingCount(0);
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
      className="flex-1 bg-[#FFF8F3]"
      contentContainerClassName="pb-10"
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
      <BrandHero
        compact
        eyebrow="Yönetim"
        title={user?.full_name || 'Admin'}
        subtitle={user?.email ?? 'Platform denetimi'}
        right={
          <View className="rounded-2xl bg-white/20 p-3">
            <Ionicons name="shield-checkmark" size={28} color="#fff" />
          </View>
        }
      />

      <View className="-mt-4 rounded-t-3xl bg-[#FFF8F3] px-4 pt-6">
        <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-orange-100 bg-white px-4 py-3">
          <View>
            <Text className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Onay kuyruğu
            </Text>
            <Text className="mt-1 text-2xl font-bold text-stone-900">
              {loading ? '…' : pendingCount}
            </Text>
          </View>
          <Pressable
            className="rounded-xl bg-brand px-4 py-2.5"
            onPress={() => navigation.navigate('SellerApprovals')}
          >
            <Text className="font-bold text-white">İncele</Text>
          </Pressable>
        </View>

        <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">
          Menü
        </Text>

        <MenuTile
          title="Satıcı onayları"
          subtitle="Mağaza onayla, geri al veya pasife al"
          icon="checkmark-circle-outline"
          badge={pendingCount}
          onPress={() => navigation.navigate('SellerApprovals')}
        />
        <MenuTile
          title="Kullanıcılar"
          subtitle="Kayıtlı hesaplar ve roller"
          icon="people-outline"
          onPress={() => navigation.navigate('UserManagement')}
        />
        <MenuTile
          title="Lisans anahtarları"
          subtitle="Satıcı süre kodu üret ve paylaş"
          icon="key-outline"
          onPress={() => navigation.navigate('LicenseKeys')}
        />
        <MenuTile
          title="Şikayetler"
          subtitle="Platform dışı anlaşma / sızıntı bildirimleri"
          icon="warning-outline"
          onPress={() => navigation.navigate('Reports')}
        />
        <MenuTile
          title="Komisyon"
          subtitle="Oranı ayarla, platform geliri"
          icon="cash-outline"
          onPress={() => navigation.navigate('Commission')}
        />
        <MenuTile
          title="İstatistikler"
          subtitle="Kullanıcı, mağaza, sipariş özeti"
          icon="stats-chart-outline"
          onPress={() => navigation.navigate('PlatformStats')}
        />

        <PrimaryButton
          label="Çıkış Yap"
          variant="danger"
          loading={signingOut}
          onPress={() => void handleSignOut()}
          className="mt-4"
        />
      </View>
    </ScrollView>
  );
}

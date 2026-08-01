import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../context/AuthContext';
import { writeAuditLog } from '../../services/adminOps';
import { supabase } from '../../services/supabase';
import type { AdminRole, User } from '../../types/database';
import { ui } from '../../theme/ui';

const ROLES: Array<{ id: AdminRole; label: string; hint: string }> = [
  { id: 'super', label: 'Super', hint: 'Tam yetki' },
  { id: 'support', label: 'Destek', hint: 'Onay, şikayet, sipariş' },
  { id: 'finance', label: 'Finans', hint: 'Komisyon, tahsilat, özet' },
];

export function AdminRolesScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .order('email');
      if (error) throw error;
      setRows((data as User[]) ?? []);
    } catch (e) {
      Alert.alert(
        'Hata',
        e instanceof Error
          ? e.message
          : 'Roller yüklenemedi. SQL kurulumunu çalıştırdın mı?'
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

  const setRole = (target: User, role: AdminRole) => {
    Alert.alert(
      'Rol değiştir',
      `${target.email} → ${role}`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaydet',
          onPress: () => {
            void (async () => {
              try {
                const { error } = await supabase
                  .from('users')
                  .update({ admin_role: role })
                  .eq('id', target.id);
                if (error) throw error;
                if (user?.id) {
                  await writeAuditLog({
                    actorId: user.id,
                    action: 'admin.role_set',
                    entityType: 'user',
                    entityId: target.id,
                    meta: { role, email: target.email },
                  });
                }
                await load();
              } catch (e) {
                Alert.alert(
                  'Hata',
                  e instanceof Error ? e.message : 'Güncellenemedi.'
                );
              }
            })();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator color={ui.brand} />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-[#FFF8F3]"
      contentContainerClassName="px-4 py-4 pb-10"
      data={rows}
      keyExtractor={(item) => item.id}
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
      ListHeaderComponent={
        <Text className="mb-3 text-sm text-stone-500">
          Admin hesaplarına destek / finans / super rolü ata. Bu build’de kayıt
          tutulur; ekran kısıtı bir sonraki iterasyonda sıkılaştırılır.
        </Text>
      }
      ListEmptyComponent={
        <Text className="text-center text-stone-500">Admin bulunamadı.</Text>
      }
      renderItem={({ item }) => {
        const current = (item.admin_role as AdminRole | null) ?? 'super';
        return (
          <View className="mb-3 rounded-2xl border border-stone-200 bg-white p-4">
            <Text className="font-bold text-stone-900">
              {item.full_name ?? 'Admin'}
            </Text>
            <Text className="text-sm text-stone-500">{item.email}</Text>
            <View className="mt-3 flex-row flex-wrap">
              {ROLES.map((r) => {
                const selected = current === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => setRole(item, r.id)}
                    className={`mb-2 mr-2 rounded-xl border px-3 py-2 ${
                      selected
                        ? 'border-brand bg-orange-50'
                        : 'border-stone-200 bg-stone-50'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        selected ? 'text-brand' : 'text-stone-700'
                      }`}
                    >
                      {r.label}
                    </Text>
                    <Text className="text-[10px] text-stone-400">{r.hint}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      }}
    />
  );
}

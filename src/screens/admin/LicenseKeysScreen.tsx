import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../context/AuthContext';
import {
  createLicenseKey,
  listLicenseKeysAdmin,
} from '../../services/licenses';
import type { LicenseKey } from '../../types/database';

const DURATION_PRESETS = [
  { days: 30, label: '30 gün' },
  { days: 90, label: '90 gün' },
  { days: 365, label: '1 yıl' },
] as const;

export function LicenseKeysScreen() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [durationDays, setDurationDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listLicenseKeysAdmin();
      setKeys(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Lisans listesi yüklenemedi. SQL kurulumunu çalıştırdın mı?'
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

  const handleCreate = async () => {
    if (!user?.id) return;
    try {
      setCreating(true);
      const created = await createLicenseKey(user.id, {
        durationDays,
        notes: notes.trim() || undefined,
      });
      setNotes('');
      setKeys((prev) => [created, ...prev]);
      Alert.alert('Anahtar oluşturuldu', created.code, [
        {
          text: 'Paylaş',
          onPress: () => {
            void Share.share({
              message: `Baret satıcı lisansı (${durationDays} gün):\n${created.code}`,
            });
          },
        },
        { text: 'Tamam' },
      ]);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Anahtar oluşturulamadı.';
      Alert.alert('Hata', message);
    } finally {
      setCreating(false);
    }
  };

  const handleShare = (item: LicenseKey) => {
    void Share.share({
      message: `Baret satıcı lisansı (${item.duration_days} gün):\n${item.code}`,
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator color="#FF6B00" />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-[#FFF8F3]"
      data={keys}
      keyExtractor={(item) => item.id}
      contentContainerClassName="px-4 py-3 pb-10"
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
      ListHeaderComponent={
        <View className="mb-4">
          <View className="mb-4 rounded-2xl border border-stone-200 bg-white p-4">
            <Text className="mb-1 text-base font-semibold text-stone-900">
              Yeni lisans anahtarı
            </Text>
            <Text className="mb-3 text-xs text-stone-500">
              Satıcıya verilecek tek kullanımlık kod. Aktive edilince süre mağazaya eklenir.
            </Text>

            <Text className="mb-2 text-xs font-semibold uppercase text-stone-500">
              Süre
            </Text>
            <View className="mb-3 flex-row flex-wrap gap-2">
              {DURATION_PRESETS.map((preset) => {
                const selected = durationDays === preset.days;
                return (
                  <Pressable
                    key={preset.days}
                    className={`rounded-full px-3 py-2 ${
                      selected
                        ? 'bg-brand'
                        : 'border border-stone-200 bg-[#FFF8F3]'
                    }`}
                    onPress={() => setDurationDays(preset.days)}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        selected ? 'text-white' : 'text-stone-700'
                      }`}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mb-1 text-xs font-semibold uppercase text-stone-500">
              Not (opsiyonel)
            </Text>
            <TextInput
              className="mb-3 rounded-xl border border-stone-200 bg-[#FFF8F3] px-3 py-2.5 text-sm text-stone-900"
              placeholder="Örn. Ahmet Usta — Mart kampanyası"
              placeholderTextColor="#a8a29e"
              value={notes}
              onChangeText={setNotes}
            />

            <Pressable
              className={`items-center rounded-xl bg-brand py-3 ${
                creating ? 'opacity-70' : ''
              }`}
              disabled={creating}
              onPress={() => void handleCreate()}
            >
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Anahtar üret</Text>
              )}
            </Pressable>
          </View>

          <Text className="mb-1 text-sm text-stone-500">
            {keys.length} anahtar
          </Text>
          {error ? (
            <Text className="mt-1 text-sm text-red-600">{error}</Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <Text className="mt-6 text-center text-sm text-stone-500">
          Henüz lisans anahtarı yok.
        </Text>
      }
      renderItem={({ item }) => {
        const used = Boolean(item.redeemed_at);
        return (
          <View className="mb-3 rounded-2xl border border-stone-200 bg-white p-4">
            <View className="mb-2 flex-row items-start justify-between">
              <Text
                className="flex-1 pr-2 font-mono text-base font-bold text-stone-900"
                selectable
              >
                {item.code}
              </Text>
              <View
                className={`rounded-full px-2.5 py-1 ${
                  used ? 'bg-stone-100' : 'bg-green-50'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    used ? 'text-stone-600' : 'text-green-700'
                  }`}
                >
                  {used ? 'Kullanıldı' : 'Boşta'}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-stone-600">
              {item.duration_days} gün
              {item.notes ? ` · ${item.notes}` : ''}
            </Text>
            <Text className="mt-1 text-xs text-stone-400">
              Oluşturulma:{' '}
              {new Date(item.created_at).toLocaleString('tr-TR')}
            </Text>
            {used && item.redeemed_at ? (
              <Text className="mt-1 text-xs text-stone-400">
                Kullanım: {new Date(item.redeemed_at).toLocaleString('tr-TR')}
              </Text>
            ) : null}
            {!used ? (
              <Pressable
                className="mt-3 items-center rounded-xl border border-brand bg-orange-50 py-2.5"
                onPress={() => handleShare(item)}
              >
                <Text className="text-sm font-semibold text-brand">Paylaş</Text>
              </Pressable>
            ) : null}
          </View>
        );
      }}
    />
  );
}

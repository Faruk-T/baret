import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../context/AuthContext';
import {
  createLicenseKey,
  listLicenseKeysAdmin,
} from '../../services/licenses';
import type { LicenseKey } from '../../types/database';

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function LicenseKeysScreen() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expiresAt, setExpiresAt] = useState(() => addDays(new Date(), 30));
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setKeys(await listLicenseKeysAdmin());
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
        expiresAt,
        notes: notes.trim() || undefined,
      });
      setNotes('');
      setKeys((prev) => [created, ...prev]);
      const label = expiresAt.toLocaleDateString('tr-TR');
      Alert.alert('Anahtar oluşturuldu', created.code, [
        {
          text: 'Paylaş',
          onPress: () => {
            void Share.share({
              message: `Baret satıcı lisansı (bitiş: ${label}):\n${created.code}`,
            });
          },
        },
        { text: 'Tamam' },
      ]);
    } catch (e) {
      Alert.alert(
        'Hata',
        e instanceof Error ? e.message : 'Anahtar oluşturulamadı.'
      );
    } finally {
      setCreating(false);
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
              Takvimden bitiş tarihi seç. Satıcı aktive edince lisans o güne kadar
              geçerli olur; sonrasında yeni anahtar olmadan panele giremez.
            </Text>

            <Text className="mb-2 text-xs font-semibold uppercase text-stone-500">
              Bitiş tarihi
            </Text>
            <Pressable
              className="mb-2 rounded-xl border border-stone-200 bg-[#FFF8F3] px-3 py-3"
              onPress={() => setShowPicker(true)}
            >
              <Text className="text-base font-bold text-stone-900">
                {expiresAt.toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </Pressable>

            {showPicker ? (
              <DateTimePicker
                value={expiresAt}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={addDays(new Date(), 1)}
                onChange={(_, date) => {
                  if (Platform.OS === 'android') setShowPicker(false);
                  if (date) setExpiresAt(date);
                }}
              />
            ) : null}

            <Text className="mb-1 mt-2 text-xs font-semibold uppercase text-stone-500">
              Not (opsiyonel)
            </Text>
            <TextInput
              className="mb-3 rounded-xl border border-stone-200 bg-[#FFF8F3] px-3 py-2.5 text-sm text-stone-900"
              placeholder="Örn. Livza Yapı — Ağustos lisans"
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

          <Text className="mb-1 text-sm text-stone-500">{keys.length} anahtar</Text>
          {error ? <Text className="mt-1 text-sm text-red-600">{error}</Text> : null}
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
              {item.expires_at
                ? `Bitiş: ${new Date(item.expires_at).toLocaleDateString('tr-TR')}`
                : `${item.duration_days} gün (eski format)`}
              {item.notes ? ` · ${item.notes}` : ''}
            </Text>
            <Text className="mt-1 text-xs text-stone-400">
              Oluşturulma: {new Date(item.created_at).toLocaleString('tr-TR')}
            </Text>
            {!used ? (
              <Pressable
                className="mt-3 items-center rounded-xl border border-brand bg-orange-50 py-2.5"
                onPress={() =>
                  void Share.share({
                    message: `Baret satıcı lisansı${
                      item.expires_at
                        ? ` (bitiş: ${new Date(item.expires_at).toLocaleDateString('tr-TR')})`
                        : ''
                    }:\n${item.code}`,
                  })
                }
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

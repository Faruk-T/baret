import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../context/AuthContext';
import { listSellersAdmin } from '../../services/adminPeople';
import {
  createNotification,
  listMyNotifications,
  markNotificationRead,
  writeAuditLog,
} from '../../services/adminOps';
import type { AppNotification } from '../../types/database';
import { ui } from '../../theme/ui';

export function NotificationsCenterScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'inbox' | 'send'>('send');
  const [inbox, setInbox] = useState<AppNotification[]>([]);
  const [sellers, setSellers] = useState<
    Awaited<ReturnType<typeof listSellersAdmin>>
  >([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [notes, sellerRows] = await Promise.all([
        listMyNotifications(user.id).catch(() => []),
        listSellersAdmin().catch(() => []),
      ]);
      setInbox(notes);
      setSellers(sellerRows);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const send = async () => {
    if (!user?.id || !selectedUserId) {
      Alert.alert('Alıcı seç', 'Bildirim göndermek için satıcı seç.');
      return;
    }
    if (!title.trim() || !body.trim()) {
      Alert.alert('Eksik', 'Başlık ve metin gerekli.');
      return;
    }
    try {
      setSending(true);
      await createNotification({
        userId: selectedUserId,
        title: title.trim(),
        body: body.trim(),
        kind: 'admin',
        createdBy: user.id,
      });
      await writeAuditLog({
        actorId: user.id,
        action: 'notification.send',
        entityType: 'user',
        entityId: selectedUserId,
        meta: { title: title.trim() },
      });
      setTitle('');
      setBody('');
      Alert.alert('Gönderildi', 'Uygulama içi bildirim kaydedildi.');
    } catch (e) {
      Alert.alert(
        'Hata',
        e instanceof Error
          ? e.message
          : 'Gönderilemedi. docs/admin-ops-v2-setup.sql çalıştır.'
      );
    } finally {
      setSending(false);
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
    <View className="flex-1 bg-[#FFF8F3]">
      <View className="flex-row px-4 pt-3">
        {(
          [
            ['send', 'Gönder'],
            ['inbox', 'Gelen'],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            className={`mr-2 rounded-full border px-4 py-2 ${
              tab === id
                ? 'border-brand bg-orange-50'
                : 'border-stone-200 bg-white'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                tab === id ? 'text-brand' : 'text-stone-600'
              }`}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'send' ? (
        <FlatList
          className="flex-1"
          contentContainerClassName="px-4 py-4 pb-10"
          data={sellers}
          keyExtractor={(item) => item.user.id}
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
            <View className="mb-4">
              <Text className="mb-2 text-sm text-stone-500">
                Uygulama içi bildirim. Cihaz push (FCM) sonraki adımda; satıcı
                paneline düşer.
              </Text>
              <TextInput
                className="mb-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                placeholder="Başlık"
                placeholderTextColor="#a8a29e"
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                className="mb-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                placeholder="Mesaj"
                placeholderTextColor="#a8a29e"
                value={body}
                onChangeText={setBody}
                multiline
              />
              <Pressable
                className={`mb-4 items-center rounded-2xl bg-brand py-3.5 ${
                  sending ? 'opacity-60' : ''
                }`}
                disabled={sending}
                onPress={() => void send()}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-bold text-white">Bildirim gönder</Text>
                )}
              </Pressable>
              <Text className="mb-2 text-xs font-bold uppercase text-stone-500">
                Alıcı satıcı
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const selected = selectedUserId === item.user.id;
            return (
              <Pressable
                onPress={() => setSelectedUserId(item.user.id)}
                className={`mb-2 rounded-2xl border px-3 py-3 ${
                  selected
                    ? 'border-brand bg-orange-50'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <Text className="font-semibold text-stone-900">
                  {item.store?.name ?? item.user.full_name ?? 'Satıcı'}
                </Text>
                <Text className="text-xs text-stone-500">{item.user.email}</Text>
              </Pressable>
            );
          }}
        />
      ) : (
        <FlatList
          className="flex-1"
          contentContainerClassName="px-4 py-4 pb-10"
          data={inbox}
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
          ListEmptyComponent={
            <Text className="text-center text-stone-500">
              Henüz bildirim yok.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              className={`mb-2 rounded-2xl border px-3 py-3 ${
                item.is_read
                  ? 'border-stone-200 bg-white'
                  : 'border-brand/40 bg-orange-50'
              }`}
              onPress={() => {
                void markNotificationRead(item.id).then(() => load());
              }}
            >
              <Text className="font-bold text-stone-900">{item.title}</Text>
              <Text className="mt-1 text-sm text-stone-600">{item.body}</Text>
              <Text className="mt-2 text-[10px] text-stone-400">
                {new Date(item.created_at).toLocaleString('tr-TR')}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

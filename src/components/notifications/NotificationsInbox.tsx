import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  listMyNotifications,
  markNotificationRead,
} from '../../services/adminOps';
import type { AppNotification } from '../../types/database';
import { ui } from '../../theme/ui';

type Props = {
  userId: string;
  limit?: number;
};

export function NotificationsInbox({ userId, limit = 8 }: Props) {
  const [rows, setRows] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setRows(await listMyNotifications(userId));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  if (loading) {
    return (
      <View className="py-4">
        <ActivityIndicator color={ui.brand} />
      </View>
    );
  }

  const visible = rows.slice(0, limit);
  const unread = rows.filter((r) => !r.is_read).length;

  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs font-bold uppercase tracking-wide text-stone-500">
          Bildirimler
        </Text>
        {unread > 0 ? (
          <Text className="text-xs font-bold text-brand">{unread} yeni</Text>
        ) : null}
      </View>
      {visible.length === 0 ? (
        <Text className="text-sm text-stone-400">Henüz bildirim yok.</Text>
      ) : (
        visible.map((item) => (
          <Pressable
            key={item.id}
            className={`mb-2 rounded-2xl border px-3 py-2.5 ${
              item.is_read
                ? 'border-stone-200 bg-white'
                : 'border-orange-200 bg-orange-50'
            }`}
            onPress={() => {
              void markNotificationRead(item.id).then(() => load());
            }}
          >
            <Text className="text-sm font-semibold text-stone-900">
              {item.title}
            </Text>
            <Text className="mt-0.5 text-xs text-stone-600" numberOfLines={2}>
              {item.body}
            </Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

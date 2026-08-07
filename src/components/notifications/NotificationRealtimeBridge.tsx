import { useEffect, useRef } from 'react';

import { useAuth } from '../../context/AuthContext';
import {
  presentLocalAlert,
  requestNotificationPermission,
} from '../../services/deviceNotifications';
import { supabase } from '../../services/supabase';
import type { AppNotification } from '../../types/database';

/**
 * When a new in-app notification row arrives, also fire a device notification
 * with sound (foreground / while Realtime is connected).
 * Full closed-app FCM push still needs Expo/FCM credentials — next hardening step.
 */
export function NotificationRealtimeBridge() {
  const { user } = useAuth();
  const ready = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    ready.current = false;
    void requestNotificationPermission().catch(() => undefined);
    const boot = setTimeout(() => {
      ready.current = true;
    }, 2500);

    const channel = supabase
      .channel(`device-notify-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'app_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (!ready.current) return;
          const row = payload.new as AppNotification;
          void presentLocalAlert({
            title: row.title,
            body: row.body,
            data: { notificationId: row.id, kind: row.kind },
          });
        }
      )
      .subscribe();

    return () => {
      clearTimeout(boot);
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return null;
}

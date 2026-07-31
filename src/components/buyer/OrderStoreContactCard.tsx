import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  getOrderStoreContact,
  type StoreContact,
} from '../../services/reports';
import { openMapsTo } from '../../utils/geo';
import { ui } from '../../theme/ui';

type Props = {
  orderId: string;
  unlocked: boolean;
};

export function OrderStoreContactCard({ orderId, unlocked }: Props) {
  const [contact, setContact] = useState<StoreContact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unlocked) {
      setContact(null);
      setError(null);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getOrderStoreContact(orderId);
        if (mounted) setContact(data);
      } catch (e) {
        if (mounted) {
          setError(
            e instanceof Error
              ? e.message
              : 'İletişim açılamadı (SQL kurulumunu kontrol et).'
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [orderId, unlocked]);

  if (!unlocked) {
    return (
      <View className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <Text className="text-xs font-bold text-amber-900">
          Mağaza iletişimi kilitli
        </Text>
        <Text className="mt-1 text-xs leading-4 text-amber-800">
          Telefon, adres ve harita; satıcı siparişi kabul ettikten sonra
          (Hazırlanıyor+) açılır. Platform dışı anlaşma yasaktır.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="mt-3 items-center py-3">
        <ActivityIndicator color={ui.brand} />
      </View>
    );
  }

  if (error || !contact) {
    return (
      <View className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
        <Text className="text-xs text-red-700">
          {error ?? 'İletişim bilgisi yok.'}
        </Text>
      </View>
    );
  }

  return (
    <View className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3">
      <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-green-800">
        Mağaza iletişimi
      </Text>
      <Text className="text-sm font-semibold text-stone-900">{contact.store_name}</Text>
      <Text className="mt-1 text-sm text-stone-700">{contact.phone}</Text>
      {contact.email ? (
        <Text className="text-xs text-stone-500">{contact.email}</Text>
      ) : null}
      <Text className="mt-1 text-xs text-stone-600">
        {contact.address}
        {contact.district ? `, ${contact.district}` : ''} / {contact.city}
      </Text>

      <View className="mt-3 flex-row gap-2">
        <Pressable
          className="flex-1 flex-row items-center justify-center rounded-xl bg-brand py-2.5"
          onPress={() => {
            void Linking.openURL(`tel:${contact.phone.replace(/\s/g, '')}`);
          }}
        >
          <Ionicons name="call" size={16} color="#fff" />
          <Text className="ml-1.5 text-sm font-bold text-white">Ara</Text>
        </Pressable>
        {contact.latitude != null && contact.longitude != null ? (
          <Pressable
            className="flex-1 flex-row items-center justify-center rounded-xl border border-brand bg-white py-2.5"
            onPress={() => {
              void openMapsTo(
                {
                  latitude: contact.latitude!,
                  longitude: contact.longitude!,
                },
                contact.store_name
              ).catch((e) => {
                Alert.alert(
                  'Harita',
                  e instanceof Error ? e.message : 'Harita açılamadı.'
                );
              });
            }}
          >
            <Ionicons name="map-outline" size={16} color={ui.brand} />
            <Text className="ml-1.5 text-sm font-bold text-brand">Harita</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

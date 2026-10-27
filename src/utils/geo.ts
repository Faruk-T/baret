import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

/** Haversine distance in meters. */
export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export async function getCurrentCoords(): Promise<Coords> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    return new Promise<Coords>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        () => reject(new Error('Tarayıcı konum izni verilmedi veya konum alınamadı.')),
        { enableHighAccuracy: false, timeout: 10000 }
      );
    });
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Konum izni verilmedi. Ayarlardan konum erişimini aç.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

/**
 * Open a maps app / browser directions across Web, iOS, and Android.
 * Avoid Linking.canOpenURL on Android — https maps URLs often return false
 * without QUERY_ALL_PACKAGES / intent queries even when openURL would work.
 */
export async function openMapsTo(
  dest: Coords,
  label?: string
): Promise<void> {
  const name = encodeURIComponent(label || 'Mağaza');
  const { latitude, longitude } = dest;
  const query = `${latitude},${longitude}`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${query}`;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    await Linking.openURL(webUrl);
    return;
  }

  const candidates =
    Platform.OS === 'ios'
      ? [
          `maps:0,0?q=${name}@${query}`,
          `http://maps.apple.com/?daddr=${query}&q=${name}`,
          webUrl,
        ]
      : [
          `geo:${query}?q=${query}(${name})`,
          `google.navigation:q=${query}`,
          webUrl,
          `https://www.google.com/maps/search/?api=1&query=${query}`,
        ];

  let lastError: unknown;
  for (const url of candidates) {
    try {
      await Linking.openURL(url);
      return;
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Harita uygulaması açılamadı.');
}

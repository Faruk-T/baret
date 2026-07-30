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

/** Open Apple Maps / Google Maps directions to a destination. */
export async function openMapsTo(
  dest: Coords,
  label?: string
): Promise<void> {
  const name = encodeURIComponent(label || 'Mağaza');
  const { latitude, longitude } = dest;

  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${latitude},${longitude}&q=${name}`
      : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  const can = await Linking.canOpenURL(url);
  if (!can) {
    throw new Error('Harita uygulaması açılamadı.');
  }
  await Linking.openURL(url);
}

import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <View className="mb-4 rounded-2xl bg-brand px-6 py-3">
        <Text className="text-xl font-bold text-white">Baret</Text>
      </View>
      <Text className="mb-2 text-center text-lg font-semibold text-gray-900">
        NativeWind kurulumu tamamlandı
      </Text>
      <Text className="text-center text-sm text-gray-500">
        Faz 2 · Gün 7 — Expo + Tailwind styling altyapısı hazır
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

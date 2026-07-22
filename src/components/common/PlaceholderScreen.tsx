import { Text, View } from 'react-native';

type PlaceholderScreenProps = {
  title: string;
  description?: string;
};

export function PlaceholderScreen({
  title,
  description = 'Bu ekran sonraki aşamada doldurulacak.',
}: PlaceholderScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="mb-2 text-center text-2xl font-bold text-gray-900">{title}</Text>
      <Text className="text-center text-sm text-gray-500">{description}</Text>
    </View>
  );
}

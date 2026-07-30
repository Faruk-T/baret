import { Image, Text, View } from 'react-native';

type Props = {
  uri?: string | null;
  size?: number;
};

export function ProductThumb({ uri, size = 64 }: Props) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size }}
        className="mr-3 rounded-xl bg-stone-200"
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={{ width: size, height: size }}
      className="mr-3 items-center justify-center rounded-xl bg-stone-200"
    >
      <Text className="text-xs text-stone-500">Görsel yok</Text>
    </View>
  );
}

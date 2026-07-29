import { Pressable, Text, View } from 'react-native';

type Props = {
  value: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md';
  readonly?: boolean;
};

export function StarRating({ value, onChange, size = 'md', readonly }: Props) {
  const starSize = size === 'sm' ? 'text-base' : 'text-2xl';
  const editable = !readonly && !!onChange;

  return (
    <View className="flex-row items-center">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        return (
          <Pressable
            key={star}
            disabled={!editable}
            onPress={() => onChange?.(star)}
            hitSlop={6}
            className="mr-1"
          >
            <Text className={`${starSize} ${filled ? 'text-brand' : 'text-stone-300'}`}>
              ★
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

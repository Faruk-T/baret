import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { ui } from '../../theme/ui';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon = 'cube-outline',
  title,
  description,
  actionLabel,
  onAction,
}: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View
        className="mb-5 h-20 w-20 items-center justify-center rounded-3xl"
        style={{ backgroundColor: ui.brandSoft }}
      >
        <Ionicons name={icon} size={36} color={ui.brand} />
      </View>
      <Text className="mb-2 text-center text-xl font-bold text-stone-900">
        {title}
      </Text>
      <Text className="mb-6 text-center text-sm leading-5 text-stone-500">
        {description}
      </Text>
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} className="min-w-[180px]" />
      ) : null}
    </View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { ui } from '../../theme/ui';

type Props = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number | string;
};

export function MenuTile({ title, subtitle, icon, onPress, badge }: Props) {
  return (
    <Pressable
      className="mb-3 flex-row items-center rounded-2xl border border-stone-200 bg-white p-4"
      style={ui.shadow}
      onPress={onPress}
    >
      <View
        className="mr-3 h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: ui.brandSoft }}
      >
        <Ionicons name={icon} size={24} color={ui.brand} />
      </View>
      <View className="flex-1 pr-2">
        <Text className="text-base font-bold text-stone-900">{title}</Text>
        <Text className="mt-0.5 text-sm text-stone-500">{subtitle}</Text>
      </View>
      {badge != null && badge !== '' && Number(badge) !== 0 ? (
        <View className="mr-2 min-w-[28px] items-center rounded-full bg-brand px-2 py-1">
          <Text className="text-xs font-bold text-white">{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={ui.muted} />
    </Pressable>
  );
}

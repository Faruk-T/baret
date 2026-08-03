import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ui } from '../../theme/ui';

type Props = {
  unread: number;
  onPress: () => void;
};

export function NotificationBellButton({ unread, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-orange-50"
      accessibilityLabel="Bildirimler"
    >
      <Ionicons name="notifications-outline" size={22} color={ui.brand} />
      {unread > 0 ? (
        <View className="absolute -right-0.5 -top-0.5 min-w-[18px] items-center rounded-full bg-red-500 px-1">
          <Text className="text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

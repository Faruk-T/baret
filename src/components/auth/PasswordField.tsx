import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = Omit<TextInputProps, 'secureTextEntry'> & {
  label: string;
};

/**
 * Password field with show/hide eye toggle for login & register.
 */
export function PasswordField({ label, ...rest }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View className="mb-6">
      <Text className="mb-2 text-sm font-medium text-stone-700">{label}</Text>
      <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-50 px-3">
        <TextInput
          className="flex-1 py-3 pr-2 text-base text-stone-900"
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          {...rest}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
          hitSlop={8}
          onPress={() => setVisible((v) => !v)}
          className="p-2"
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color="#78716c"
          />
        </Pressable>
      </View>
    </View>
  );
}

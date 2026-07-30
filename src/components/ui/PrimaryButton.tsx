import { Pressable, Text, View, type PressableProps } from 'react-native';
import { ActivityIndicator } from 'react-native';

import { ui } from '../../theme/ui';

type Props = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export function PrimaryButton({
  label,
  loading,
  variant = 'primary',
  disabled,
  className,
  ...rest
}: Props & { className?: string }) {
  const isDisabled = disabled || loading;

  const styles =
    variant === 'primary'
      ? 'bg-brand'
      : variant === 'secondary'
        ? 'border border-brand bg-orange-50'
        : variant === 'danger'
          ? 'border border-red-200 bg-red-50'
          : 'bg-transparent';

  const text =
    variant === 'primary'
      ? 'text-white'
      : variant === 'danger'
        ? 'text-red-600'
        : 'text-brand';

  return (
    <Pressable
      className={`items-center rounded-2xl py-3.5 ${styles} ${
        isDisabled ? 'opacity-60' : ''
      } ${className ?? ''}`}
      disabled={isDisabled}
      style={variant === 'primary' ? ui.shadow : undefined}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#fff' : ui.brand}
        />
      ) : (
        <Text className={`text-base font-bold ${text}`}>{label}</Text>
      )}
    </Pressable>
  );
}

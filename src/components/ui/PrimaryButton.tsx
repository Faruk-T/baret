import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

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
      ? 'bg-zinc-900'
      : variant === 'secondary'
        ? 'border border-zinc-300 bg-white'
        : variant === 'danger'
          ? 'border border-red-200 bg-red-50'
          : 'bg-transparent';

  const text =
    variant === 'primary'
      ? 'text-white'
      : variant === 'danger'
        ? 'text-red-600'
        : 'text-zinc-900';

  return (
    <Pressable
      className={`items-center rounded-xl py-3 ${styles} ${
        isDisabled ? 'opacity-60' : ''
      } ${className ?? ''}`}
      disabled={isDisabled}
      style={variant === 'primary' ? ui.shadow : undefined}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#fff' : ui.ink}
        />
      ) : (
        <Text className={`text-sm font-semibold ${text}`}>{label}</Text>
      )}
    </Pressable>
  );
}

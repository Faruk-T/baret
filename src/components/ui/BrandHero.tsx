import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: ReactNode;
  compact?: boolean;
};

/** Architectural charcoal hero header used on mobile/tablet hub & auth screens. */
export function BrandHero({
  title,
  subtitle,
  eyebrow,
  right,
  compact,
}: Props) {
  return (
    <LinearGradient
      colors={['#18181B', '#27272A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingHorizontal: compact ? 20 : 24,
        paddingTop: compact ? 36 : 48,
        paddingBottom: compact ? 24 : 36,
        overflow: 'hidden',
      }}
    >
      <View className="flex-row items-start justify-between max-w-[1120px] w-full self-center">
        <View className="flex-1 pr-3">
          {eyebrow ? (
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-[1.5px] text-amber-400">
              {eyebrow}
            </Text>
          ) : null}
          <Text
            className={`font-bold text-white tracking-tight ${
              compact ? 'text-2xl' : 'text-3xl'
            }`}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-1.5 text-sm leading-5 text-zinc-300">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    </LinearGradient>
  );
}

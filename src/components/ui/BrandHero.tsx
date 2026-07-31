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

/** Brand-forward orange hero strip used on auth and hub screens. */
export function BrandHero({
  title,
  subtitle,
  eyebrow,
  right,
  compact,
}: Props) {
  return (
    <LinearGradient
      colors={['#FF6B00', '#E55F00', '#C2410C']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingHorizontal: compact ? 20 : 24,
        paddingTop: compact ? 40 : 56,
        paddingBottom: compact ? 24 : 40,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute',
          right: -32,
          top: -40,
          height: 144,
          width: 144,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.12)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 40,
          bottom: -40,
          height: 112,
          width: 112,
          borderRadius: 999,
          backgroundColor: 'rgba(0,0,0,0.12)',
        }}
      />
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          {eyebrow ? (
            <Text className="mb-2 text-xs font-bold uppercase tracking-[2px] text-orange-100">
              {eyebrow}
            </Text>
          ) : null}
          <Text
            className={`font-bold text-white ${
              compact ? 'text-2xl' : 'text-4xl'
            }`}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-2 text-base leading-6 text-orange-50">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    </LinearGradient>
  );
}

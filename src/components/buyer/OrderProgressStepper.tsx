import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { OrderStatus } from '../../types/database';

type Props = {
  status: OrderStatus;
  deliveryOption?: string;
};

type Step = {
  key: OrderStatus;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const STEPS: Step[] = [
  { key: 'pending', title: 'Alındı', icon: 'document-text' },
  { key: 'preparing', title: 'Hazırlanıyor', icon: 'cube' },
  { key: 'shipped', title: 'Yolda / Hazır', icon: 'bicycle' },
  { key: 'delivered', title: 'Teslim', icon: 'checkmark-circle' },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  pending: 0,
  preparing: 1,
  shipped: 2,
  delivered: 3,
  cancelled: -1,
};

export function OrderProgressStepper({ status, deliveryOption }: Props) {
  if (status === 'cancelled') {
    return (
      <View className="my-2.5 flex-row items-center rounded-2xl border border-red-200 bg-red-50/70 p-3">
        <View className="mr-2.5 h-8 w-8 items-center justify-center rounded-full bg-red-100">
          <Ionicons name="close-circle" size={20} color="#dc2626" />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-bold text-red-800">Sipariş İptal Edildi</Text>
          <Text className="text-[11px] text-red-600">
            Bu sipariş iptal edilmiştir. Stoklar mağazaya iade edildi.
          </Text>
        </View>
      </View>
    );
  }

  const currentIdx = STATUS_ORDER[status] ?? 0;

  return (
    <View className="my-3 rounded-2xl border border-stone-200 bg-white p-3.5 shadow-2xs">
      <View className="flex-row items-center justify-between">
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isFuture = idx > currentIdx;

          // Customize third step text if gel_al
          let stepTitle = step.title;
          if (step.key === 'shipped' && deliveryOption === 'gel_al') {
            stepTitle = 'Hazır';
          }

          return (
            <View key={step.key} className="flex-1 items-center">
              {/* Top Node & Connector Container */}
              <View className="w-full flex-row items-center">
                {/* Left Connector Line */}
                <View
                  className={`h-[2.5px] flex-1 ${
                    idx === 0
                      ? 'bg-transparent'
                      : isCompleted || isCurrent
                      ? 'bg-brand'
                      : 'bg-stone-200'
                  }`}
                />

                {/* Circle Icon Badge */}
                <View
                  className={`h-7 w-7 items-center justify-center rounded-full border-2 ${
                    isCompleted
                      ? 'border-brand bg-brand'
                      : isCurrent
                      ? 'border-brand bg-white shadow-xs'
                      : 'border-stone-200 bg-stone-100'
                  }`}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : (
                    <Ionicons
                      name={step.icon}
                      size={12}
                      color={isCurrent ? '#FF6B00' : '#a8a29e'}
                    />
                  )}
                </View>

                {/* Right Connector Line */}
                <View
                  className={`h-[2.5px] flex-1 ${
                    idx === STEPS.length - 1
                      ? 'bg-transparent'
                      : isCompleted
                      ? 'bg-brand'
                      : 'bg-stone-200'
                  }`}
                />
              </View>

              {/* Title */}
              <Text
                className={`mt-1.5 text-center text-[10px] ${
                  isCurrent
                    ? 'font-black text-brand'
                    : isCompleted
                    ? 'font-bold text-stone-800'
                    : 'font-medium text-stone-400'
                }`}
                numberOfLines={1}
              >
                {stepTitle}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

import { createElement, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { ui } from '../../theme/ui';

type DatePickerFieldProps = {
  label?: string;
  value: Date;
  minimumDate?: Date;
  onChange: (date: Date) => void;
};

function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DatePickerField({
  label,
  value,
  minimumDate,
  onChange,
}: DatePickerFieldProps) {
  const [showNative, setShowNative] = useState(Platform.OS === 'ios');

  if (Platform.OS === 'web') {
    return (
      <View className="mb-3">
        {label ? (
          <Text className="mb-1.5 text-xs font-semibold uppercase text-stone-500">
            {label}
          </Text>
        ) : null}
        {createElement('input', {
          type: 'date',
          value: toIsoDateString(value),
          min: minimumDate ? toIsoDateString(minimumDate) : undefined,
          onChange: (e: { target: { value: string } }) => {
            if (!e.target.value) return;
            const parsed = new Date(`${e.target.value}T12:00:00`);
            if (!Number.isNaN(parsed.getTime())) {
              onChange(parsed);
            }
          },
          style: {
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid #e7e5e4',
            backgroundColor: '#FFF8F3',
            color: '#1c1917',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'inherit',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
          },
        })}
      </View>
    );
  }

  return (
    <View className="mb-3">
      {label ? (
        <Text className="mb-1.5 text-xs font-semibold uppercase text-stone-500">
          {label}
        </Text>
      ) : null}
      <Pressable
        className="flex-row items-center justify-between rounded-xl border border-stone-200 bg-[#FFF8F3] px-3.5 py-3"
        onPress={() => setShowNative(true)}
      >
        <Text className="text-base font-bold text-stone-900">
          {value.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={ui.brand} />
      </Pressable>

      {showNative ? (
        createElement(DateTimePicker as any, {
          value,
          mode: 'date',
          display: Platform.OS === 'ios' ? 'spinner' : 'default',
          minimumDate,
          onChange: (_: unknown, date?: Date) => {
            if (Platform.OS === 'android') setShowNative(false);
            if (date) onChange(date);
          },
        })
      ) : null}
    </View>
  );
}

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';

import { StarRating } from '../../components/common/StarRating';
import { createReview } from '../../services/reviews';
import type { Review } from '../../types/database';
import {
  containsContactLeak,
  sanitizeContactLeak,
} from '../../utils/contactFilter';

type Props = {
  buyerId: string;
  storeId: string;
  orderId: string;
  existing: Review | null | undefined;
  onSaved: () => void;
};

export function OrderReviewBlock({
  buyerId,
  storeId,
  orderId,
  existing,
  onSaved,
}: Props) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [saving, setSaving] = useState(false);

  if (existing) {
    return (
      <View className="mt-3 rounded-xl border border-stone-100 bg-stone-50 p-3">
        <Text className="mb-1 text-xs font-semibold uppercase text-stone-500">
          Değerlendirmen
        </Text>
        <StarRating value={existing.rating} readonly size="sm" />
        {existing.comment ? (
          <Text className="mt-2 text-sm text-stone-700">
            {sanitizeContactLeak(existing.comment)}
          </Text>
        ) : null}
      </View>
    );
  }

  const submit = async () => {
    if (rating < 1) {
      Alert.alert('Puan', '1–5 arası yıldız seç.');
      return;
    }
    if (containsContactLeak(comment)) {
      Alert.alert(
        'İletişim gizlendi',
        'Yorumdaki telefon / WhatsApp / e-posta otomatik olarak [gizlendi] yapılır.'
      );
    }
    setSaving(true);
    try {
      await createReview({
        buyerId,
        storeId,
        orderId,
        rating,
        comment,
      });
      Alert.alert('Teşekkürler', 'Değerlendirmen kaydedildi.');
      onSaved();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Değerlendirme kaydedilemedi.';
      Alert.alert('Hata', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="mt-3 rounded-xl border border-orange-100 bg-orange-50/50 p-3">
      <Text className="mb-2 text-sm font-semibold text-stone-800">
        Mağazayı değerlendir
      </Text>
      <StarRating value={rating} onChange={setRating} />
      <TextInput
        className="mt-3 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900"
        placeholder="Yorum (isteğe bağlı)"
        value={comment}
        onChangeText={setComment}
        multiline
      />
      <Pressable
        className={`mt-3 items-center rounded-xl bg-brand py-2.5 ${saving ? 'opacity-70' : ''}`}
        disabled={saving}
        onPress={() => void submit()}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-semibold text-white">Gönder</Text>
        )}
      </Pressable>
    </View>
  );
}

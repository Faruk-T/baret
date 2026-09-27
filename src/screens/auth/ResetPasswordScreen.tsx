import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { PasswordField } from '../../components/auth/PasswordField';
import { BrandHero } from '../../components/ui/BrandHero';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useAuth } from '../../context/AuthContext';

export function ResetPasswordScreen() {
  const { updatePassword, signOut } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!password || !confirm) {
      Alert.alert('Eksik bilgi', 'Yeni şifreyi iki kez yaz.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Zayıf şifre', 'Şifre en az 6 karakter olmalı.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Uyuşmazlık', 'Şifreler aynı değil.');
      return;
    }

    try {
      setIsSubmitting(true);
      await updatePassword(password);
      Alert.alert('Şifre güncellendi', 'Yeni şifrenle devam edebilirsin.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Şifre güncellenemedi.';
      Alert.alert('Hata', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#FFF8F3]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="flex-grow"
      >
        <BrandHero
          compact
          eyebrow="Güvenlik"
          title="Yeni şifre"
          subtitle="E-postadaki bağlantıdan geldin. Yeni bir şifre belirle."
        />

        <View className="-mt-4 flex-1 rounded-t-3xl bg-[#FFF8F3] px-6 pt-7 pb-10">
          <Text className="mb-6 text-sm text-stone-500">
            Şifreni kaydettikten sonra hesabına otomatik devam edersin.
          </Text>

          <PasswordField
            label="Yeni şifre"
            placeholder="En az 6 karakter"
            value={password}
            onChangeText={setPassword}
            textContentType="newPassword"
          />

          <PasswordField
            label="Yeni şifre (tekrar)"
            placeholder="Tekrar yaz"
            value={confirm}
            onChangeText={setConfirm}
            textContentType="newPassword"
          />

          <PrimaryButton
            label="Şifreyi kaydet"
            loading={isSubmitting}
            onPress={() => void handleSave()}
            className="mb-5"
          />

          <PrimaryButton
            label="Vazgeç / çıkış"
            variant="ghost"
            onPress={() => void signOut()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

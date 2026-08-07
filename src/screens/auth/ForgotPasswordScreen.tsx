import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { BrandHero } from '../../components/ui/BrandHero';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import type { AuthStackParamList } from '../../types/navigation.types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Eksik bilgi', 'Kayıtlı e-posta adresini yaz.');
      return;
    }

    try {
      setIsSubmitting(true);
      await requestPasswordReset(trimmed);
      setSent(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Sıfırlama e-postası gönderilemedi.';
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
          eyebrow="Hesap"
          title="Şifremi unuttum"
          subtitle="Kayıtlı e-postana sıfırlama bağlantısı göndeririz."
        />

        <View className="-mt-4 flex-1 rounded-t-3xl bg-[#FFF8F3] px-6 pt-7 pb-10">
          {sent ? (
            <>
              <Text className="mb-2 text-2xl font-bold text-stone-900">E-postanı kontrol et</Text>
              <Text className="mb-6 text-sm leading-5 text-stone-500">
                {email.trim()} adresine bir bağlantı gönderdik. Gelen kutusu ve spam
                klasörüne bak; bağlantıya basınca uygulamada yeni şifre belirleyeceksin.
              </Text>
              <PrimaryButton
                label="Girişe dön"
                onPress={() => navigation.navigate('Login')}
                className="mb-4"
              />
              <Pressable onPress={() => setSent(false)}>
                <Text className="text-center text-sm font-semibold text-brand">
                  Tekrar gönder
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="mb-1 text-2xl font-bold text-stone-900">E-posta ile sıfırla</Text>
              <Text className="mb-6 text-sm text-stone-500">
                Hesabına bağlı e-postayı yaz. Güvenlik için kayıtlı olsun olmasın aynı
                bilgilendirme gösterilebilir.
              </Text>

              <Text className="mb-2 text-sm font-semibold text-stone-700">E-posta</Text>
              <TextInput
                className="mb-6 rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="ornek@email.com"
                placeholderTextColor="#a8a29e"
                value={email}
                onChangeText={setEmail}
              />

              <PrimaryButton
                label="Sıfırlama bağlantısı gönder"
                loading={isSubmitting}
                onPress={() => void handleSubmit()}
                className="mb-5"
              />

              <Pressable onPress={() => navigation.navigate('Login')}>
                <Text className="text-center text-sm text-stone-600">
                  <Text className="font-bold text-brand">Girişe dön</Text>
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

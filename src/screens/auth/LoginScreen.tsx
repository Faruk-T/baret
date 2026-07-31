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

import { PasswordField } from '../../components/auth/PasswordField';
import { BrandHero } from '../../components/ui/BrandHero';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import type { AuthStackParamList } from '../../types/navigation.types';

type LoginNavigation = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<LoginNavigation>();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Eksik bilgi', 'E-posta ve şifre gerekli.');
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn(email.trim(), password);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Giriş başarısız.';
      Alert.alert('Giriş hatası', message);
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
          eyebrow="Pazaryeri"
          title="Baret"
          subtitle="Şantiye malzemesini onaylı nalburdan bul, sipariş ver."
        />

        <View className="-mt-5 flex-1 rounded-t-3xl bg-[#FFF8F3] px-6 pt-8 pb-10">
          <Text className="mb-1 text-2xl font-bold text-stone-900">Giriş yap</Text>
          <Text className="mb-6 text-sm text-stone-500">
            Hesabınla devam et — alıcı, satıcı veya yönetici.
          </Text>

          <Text className="mb-2 text-sm font-semibold text-stone-700">E-posta</Text>
          <TextInput
            className="mb-4 rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="ornek@email.com"
            placeholderTextColor="#a8a29e"
            value={email}
            onChangeText={setEmail}
          />

          <PasswordField
            label="Şifre"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
          />

          <PrimaryButton
            label="Giriş Yap"
            loading={isSubmitting}
            onPress={() => void handleLogin()}
            className="mb-5"
          />

          <Pressable onPress={() => navigation.navigate('RoleSelect')}>
            <Text className="text-center text-sm text-stone-600">
              Hesabın yok mu?{' '}
              <Text className="font-bold text-brand">Kayıt Ol</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

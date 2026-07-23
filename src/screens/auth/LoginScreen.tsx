import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

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
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="mb-2 text-3xl font-bold text-gray-900">Baret</Text>
        <Text className="mb-8 text-base text-gray-500">Hesabına giriş yap</Text>

        <Text className="mb-2 text-sm font-medium text-gray-700">E-posta</Text>
        <TextInput
          className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="ornek@email.com"
          value={email}
          onChangeText={setEmail}
        />

        <Text className="mb-2 text-sm font-medium text-gray-700">Şifre</Text>
        <TextInput
          className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
          secureTextEntry
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          className={`mb-4 items-center rounded-xl bg-brand py-3.5 ${isSubmitting ? 'opacity-70' : ''}`}
          disabled={isSubmitting}
          onPress={handleLogin}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Giriş Yap</Text>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('RoleSelect')}>
          <Text className="text-center text-sm text-gray-600">
            Hesabın yok mu? <Text className="font-semibold text-brand">Kayıt Ol</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../../context/AuthContext';
import type { AuthStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation, route }: Props) {
  const { role } = route.params;
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleLabel = role === 'buyer' ? 'Alıcı' : 'Satıcı';

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Eksik bilgi', 'E-posta ve şifre gerekli.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Zayıf şifre', 'Şifre en az 6 karakter olmalı.');
      return;
    }

    try {
      setIsSubmitting(true);
      await signUp(email.trim(), password, {
        full_name: fullName.trim() || undefined,
        role,
      });
      Alert.alert(
        'Kayıt başarılı',
        'Hesabın oluşturuldu. E-posta onayı açıksa gelen kutunu kontrol et; değilse otomatik giriş yapılabilir.',
        [{ text: 'Tamam', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kayıt başarısız.';
      Alert.alert('Kayıt hatası', message);
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
        <Text className="mb-2 text-3xl font-bold text-gray-900">Kayıt Ol</Text>
        <Text className="mb-2 text-base text-gray-500">
          Seçilen rol: <Text className="font-semibold text-brand">{roleLabel}</Text>
        </Text>
        <Pressable className="mb-6" onPress={() => navigation.navigate('RoleSelect')}>
          <Text className="text-sm text-gray-500 underline">Rolü değiştir</Text>
        </Pressable>

        <Text className="mb-2 text-sm font-medium text-gray-700">Ad Soyad</Text>
        <TextInput
          className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
          placeholder="Adınız Soyadınız"
          value={fullName}
          onChangeText={setFullName}
        />

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
          placeholder="En az 6 karakter"
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          className={`mb-4 items-center rounded-xl bg-brand py-3.5 ${isSubmitting ? 'opacity-70' : ''}`}
          disabled={isSubmitting}
          onPress={handleRegister}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Hesap Oluştur</Text>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text className="text-center text-sm text-gray-600">
            Zaten hesabın var mı? <Text className="font-semibold text-brand">Giriş Yap</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

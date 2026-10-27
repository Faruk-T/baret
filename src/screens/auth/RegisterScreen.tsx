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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PasswordField } from '../../components/auth/PasswordField';
import { BrandHero } from '../../components/ui/BrandHero';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import type { AuthStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation, route }: Props) {
  const role = route.params?.role ?? 'buyer';
  const { signUp } = useAuth();
  const { isDesktop } = useResponsiveLayout();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleLabel = role === 'buyer' ? 'Alıcı (Müteahhit / Şantiye)' : 'Satıcı (Nalbur / Tedarikçi)';

  const handleBackToGuestCatalog = () => {
    const parent = navigation.getParent() as any;
    if (parent?.canGoBack()) {
      parent.goBack();
    } else {
      parent?.navigate('Buyer');
    }
  };

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

  const formContent = (
    <View
      className={
        isDesktop
          ? 'w-full max-w-[480px] rounded-3xl bg-white p-8 border border-slate-200 shadow-lg my-auto self-center'
          : '-mt-4 flex-1 rounded-t-3xl bg-[#FFF8F3] px-6 pt-7 pb-10'
      }
    >
      <View className="flex-row items-center justify-between mb-4">
        <View className="rounded-full bg-orange-100 px-3 py-1">
          <Text className="text-xs font-bold text-brand">Rol: {roleLabel}</Text>
        </View>
        <Pressable onPress={handleBackToGuestCatalog}>
          <Text className="text-xs font-bold text-slate-500">Kataloğa Dön ✕</Text>
        </Pressable>
      </View>

      <Pressable className="mb-5" onPress={() => navigation.navigate('RoleSelect')}>
        <Text className="text-sm font-semibold text-brand">← Rolü değiştir</Text>
      </Pressable>

      <Text className="mb-2 text-sm font-semibold text-stone-700">
        Ad Soyad / Yetkili Adı
      </Text>
      <TextInput
        className="mb-4 rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900"
        placeholder="Adınız Soyadınız"
        placeholderTextColor="#a8a29e"
        value={fullName}
        onChangeText={setFullName}
      />

      <Text className="mb-2 text-sm font-semibold text-stone-700">Kurumsal / Kişisel E-posta</Text>
      <TextInput
        className="mb-4 rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900"
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="ornek@sirket.com"
        placeholderTextColor="#a8a29e"
        value={email}
        onChangeText={setEmail}
      />

      <PasswordField
        label="Şifre"
        placeholder="En az 6 karakter"
        value={password}
        onChangeText={setPassword}
      />

      <PrimaryButton
        label="Hesap Oluştur"
        loading={isSubmitting}
        onPress={() => void handleRegister()}
        className="mb-5"
      />

      <Pressable onPress={() => navigation.navigate('Login')}>
        <Text className="text-center text-sm text-stone-600">
          Zaten hesabın var mı?{' '}
          <Text className="font-bold text-brand">Giriş Yap</Text>
        </Text>
      </Pressable>
    </View>
  );

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
          eyebrow="Yeni hesap"
          title={`${role === 'buyer' ? 'Alıcı' : 'Satıcı'} kaydı`}
          subtitle="Birkaç bilgiyle Baret’e katıl — sonra mağaza veya alışverişe geç."
        />

        {formContent}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

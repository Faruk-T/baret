import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
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
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import type { AuthStackParamList } from '../../types/navigation.types';
import { usePageSeo } from '../../utils/seo';

type LoginNavigation = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<LoginNavigation>();
  const { signIn } = useAuth();
  const { isDesktop } = useResponsiveLayout();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  usePageSeo({
    title: 'Giriş Yap | Baret Yapı & Şantiye Tedarik Platformu',
    description:
      'Baret müteahhit, şantiye satın alma ve onaylı yapı market tedarikçi hesabınıza giriş yapın.',
    canonicalPath: '/login',
  });

  const handleBackToGuestCatalog = () => {
    const parent = navigation.getParent() as any;
    if (parent?.canGoBack()) {
      parent.goBack();
    } else {
      parent?.navigate('Buyer');
    }
  };

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

  const formCard = (
    <View
      className={
        isDesktop
          ? 'w-full max-w-[440px] rounded-2xl bg-white p-8 border border-zinc-200'
          : '-mt-5 flex-1 rounded-t-3xl bg-zinc-50 px-6 pt-8 pb-10'
      }
    >
      <Pressable
        onPress={handleBackToGuestCatalog}
        className="flex-row items-center self-start mb-6 bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg"
      >
        <Feather name="arrow-left" size={14} color="#18181B" />
        <Text className="text-xs font-semibold text-zinc-800 ml-1.5">
          Kataloğa Geri Dön
        </Text>
      </Pressable>

      <Text className="mb-1 text-2xl font-bold text-zinc-900">Hesabınıza Giriş Yapın</Text>
      <Text className="mb-6 text-sm text-zinc-500">
        Şantiye satın alma, onaylı tedarikçi veya yönetici hesabınızla devam edin.
      </Text>

      <Text className="mb-1.5 text-xs font-semibold text-zinc-700">Kurumsal veya Bireysel E-posta</Text>
      <TextInput
        className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900"
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="ornek@sirket.com"
        placeholderTextColor="#A1A1AA"
        value={email}
        onChangeText={setEmail}
      />

      <PasswordField
        label="Şifre"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        className="mb-5 self-end"
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text className="text-xs font-semibold text-amber-700">Şifremi unuttum</Text>
      </Pressable>

      <PrimaryButton
        label="Giriş Yap"
        loading={isSubmitting}
        onPress={() => void handleLogin()}
        className="mb-5"
      />

      <Pressable onPress={() => navigation.navigate('RoleSelect')}>
        <Text className="text-center text-sm text-zinc-600">
          Henüz hesabınız yok mu?{' '}
          <Text className="font-bold text-zinc-900 underline">Hesap Oluşturun</Text>
        </Text>
      </Pressable>
    </View>
  );

  if (isDesktop) {
    return (
      <View className="flex-1 flex-row bg-zinc-900">
        {/* Left Architectural Showcase */}
        <View className="flex-1 justify-between p-12 bg-zinc-900 border-r border-zinc-800">
          <View>
            <Pressable
              onPress={handleBackToGuestCatalog}
              className="flex-row items-center mb-10 self-start"
            >
              <View className="w-10 h-10 rounded-lg bg-white items-center justify-center mr-3">
                <View className="w-4 h-4 rounded-sm bg-amber-600" />
              </View>
              <View>
                <Text className="text-white text-xl font-black tracking-tight">
                  BARET
                </Text>
                <Text className="text-zinc-400 text-[11px] font-medium">
                  Yapı & Şantiye Tedarik Ağı
                </Text>
              </View>
            </Pressable>

            <Text className="text-white text-3xl font-bold leading-tight max-w-[500px]">
              Yapı ve şantiye malzemelerinde doğrulanmış tedarikçi ağı.
            </Text>
            <Text className="text-zinc-400 text-sm leading-6 mt-3 max-w-[480px]">
              Toplu alımlarda otomatik kademeli iskonto, çoklu kalem şantiye ihalesi (RFQ) ve
              onaylı yapı marketlerden doğrudan şantiyenize sevkiyat.
            </Text>

            <View className="mt-8 gap-3 max-w-[480px]">
              {[
                {
                  icon: 'layers' as const,
                  title: 'Kademeli Toptan Fiyatlandırma',
                  desc: 'Palet, ton ve toplu adet alımlarında sepette otomatik birim fiyat indirimi.',
                },
                {
                  icon: 'file-text' as const,
                  title: 'Şantiye İhale & Teklif Havuzu (RFQ)',
                  desc: 'Malzeme listenizi oluşturun, bölgenizdeki onaylı tedarikçilerden resmi fiyat teklifi toplayın.',
                },
                {
                  icon: 'shield' as const,
                  title: 'PIN Kodlu Güvenli Teslimat',
                  desc: 'Şantiye tesliminde veya mağazadan teslimde 6 haneli doğrulama koduyla tam güvence.',
                },
              ].map((feat) => (
                <View
                  key={feat.title}
                  className="flex-row items-start bg-zinc-800/60 border border-zinc-800 rounded-xl p-4"
                >
                  <View className="w-9 h-9 rounded-lg bg-zinc-800 items-center justify-center mr-3.5">
                    <Feather name={feat.icon} size={16} color="#F59E0B" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-sm font-semibold">{feat.title}</Text>
                    <Text className="text-zinc-400 text-xs leading-5 mt-0.5">
                      {feat.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <Text className="text-zinc-500 text-xs">
            © {new Date().getFullYear()} Baret Teknoloji A.Ş. • Web, iOS & Android Kurumsal Pazaryeri
          </Text>
        </View>

        {/* Right Form Column */}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 32,
          }}
          className="flex-1 bg-zinc-50"
        >
          {formCard}
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-zinc-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="flex-grow"
      >
        <BrandHero
          eyebrow="Kurumsal Pazaryeri"
          title="Baret"
          subtitle="Şantiye malzemesini onaylı tedarikçiden bulun, güvenle sipariş verin."
        />

        {formCard}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

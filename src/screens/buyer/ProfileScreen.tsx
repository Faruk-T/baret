import { useCallback, useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { WebPortalFooter } from '../../components/layout/WebPortalFooter';
import { WebPortalHeader } from '../../components/layout/WebPortalHeader';
import { NotificationsInbox } from '../../components/notifications/NotificationsInbox';
import { BrandHero } from '../../components/ui/BrandHero';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { UiCard } from '../../components/ui/UiCard';
import { USER_ROLE_LABELS } from '../../constants/enums';
import { useAuth } from '../../context/AuthContext';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import {
  createBuyerSite,
  deleteBuyerSite,
  listBuyerSites,
} from '../../services/rfq';
import { deleteMyAccount } from '../../services/users';
import { ui } from '../../theme/ui';
import type { BuyerSite } from '../../types/database';
import type { BuyerProfileStackParamList } from '../../types/navigation.types';
import { usePageSeo } from '../../utils/seo';

type ProfileNav = NativeStackNavigationProp<BuyerProfileStackParamList, 'ProfileHome'>;

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const { user, session, signOut, updateProfile } = useAuth();
  const { isDesktop } = useResponsiveLayout();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [companyName, setCompanyName] = useState(user?.company_name ?? '');
  const [taxOffice, setTaxOffice] = useState(user?.tax_office ?? '');
  const [taxNumber, setTaxNumber] = useState(user?.tax_number ?? '');
  const [saving, setSaving] = useState(false);

  // Saved Jobsites (Şantiyelerim)
  const [sites, setSites] = useState<BuyerSite[]>([]);
  const [addingSite, setAddingSite] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [siteCity, setSiteCity] = useState('');
  const [siteDistrict, setSiteDistrict] = useState('');
  const [siteAddress, setSiteAddress] = useState('');

  usePageSeo({
    title: 'Kurumsal Hesabım & Şantiyelerim | Baret Yapı Tedarik',
    description:
      'Kurumsal fatura bilgilerinizi, kayıtlı şantiye teslimat adreslerinizi ve bildirimlerinizi yönetin.',
    canonicalPath: '/profile',
  });

  useEffect(() => {
    if (!editing) {
      setFullName(user?.full_name ?? '');
      setPhone(user?.phone ?? '');
      setCompanyName(user?.company_name ?? '');
      setTaxOffice(user?.tax_office ?? '');
      setTaxNumber(user?.tax_number ?? '');
    }
  }, [user, editing]);

  const loadSites = useCallback(async () => {
    if (!user?.id) return;
    const rows = await listBuyerSites(user.id);
    setSites(rows);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadSites();
    }, [loadSites])
  );

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Çıkış yapılamadı.';
      Alert.alert('Hata', message);
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleDeleteAccount = () => {
    if (!user?.id) return;
    Alert.alert(
      'Hesabı Kalıcı Olarak Sil',
      'Hesabınızı ve kişisel verilerinizi kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Hesabımı Sil',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setIsDeletingAccount(true);
                await deleteMyAccount(user.id);
                Alert.alert('Hesap Silindi', 'Hesabınız ve kişisel verileriniz başarıyla silindi.');
              } catch (error) {
                Alert.alert(
                  'Hata',
                  error instanceof Error ? error.message : 'Hesap silinemedi.'
                );
              } finally {
                setIsDeletingAccount(false);
              }
            })();
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProfile({
        full_name: fullName,
        phone,
        company_name: companyName,
        tax_office: taxOffice,
        tax_number: taxNumber,
      });
      setEditing(false);
      Alert.alert('Kaydedildi', 'Profil ve kurumsal fatura bilgilerin güncellendi.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Profil güncellenemedi.';
      Alert.alert('Hata', message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSite = async () => {
    if (!user?.id) return;
    if (!siteName.trim() || !siteCity.trim() || !siteAddress.trim()) {
      Alert.alert('Eksik bilgi', 'Şantiye adı, şehir ve açık adres zorunludur.');
      return;
    }
    await createBuyerSite({
      buyerId: user.id,
      name: siteName,
      city: siteCity,
      district: siteDistrict,
      address: siteAddress,
      contactName: user.full_name,
      contactPhone: user.phone,
      isDefault: sites.length === 0,
    });
    setSiteName('');
    setSiteCity('');
    setSiteDistrict('');
    setSiteAddress('');
    setAddingSite(false);
    await loadSites();
  };

  const cancelEdit = () => {
    setFullName(user?.full_name ?? '');
    setPhone(user?.phone ?? '');
    setCompanyName(user?.company_name ?? '');
    setTaxOffice(user?.tax_office ?? '');
    setTaxNumber(user?.tax_number ?? '');
    setEditing(false);
  };

  const tabNav = navigation.getParent() as any;
  const rootNav = navigation.getParent()?.getParent() as any;

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    if (mode === 'register') {
      rootNav?.navigate('Auth', { screen: 'RoleSelect' });
    } else {
      rootNav?.navigate('Auth');
    }
  };

  const handleNavigatePortalTab = (
    targetTab: 'catalog' | 'quick_order' | 'rfq' | 'orders' | 'profile'
  ) => {
    if (targetTab === 'catalog' || targetTab === 'quick_order') {
      tabNav?.navigate('Home');
    } else if (targetTab === 'rfq') {
      tabNav?.navigate('Rfq');
    } else if (targetTab === 'orders') {
      tabNav?.navigate('Orders');
    }
  };

  const desktopHeader = isDesktop ? (
    <WebPortalHeader
      activeTab="profile"
      onSelectTab={handleNavigatePortalTab}
      onOpenCart={() => tabNav?.navigate('Cart')}
      onOpenAuth={openAuthModal}
    />
  ) : null;

  if (!session || !user) {
    return (
      <View className="flex-1 bg-zinc-50">
        {desktopHeader}
        <ScrollView className="flex-1" contentContainerClassName="flex-grow justify-between">
          <View>
            {!isDesktop ? (
              <BrandHero
                compact
                eyebrow="Misafir Modu"
                title="Baret Hesabım"
                subtitle="Kurumsal alıcı veya onaylı nalbur satıcısı olarak katıl"
              />
            ) : null}
            <View
              style={{ maxWidth: 640, width: '100%', alignSelf: 'center' }}
              className={
                isDesktop
                  ? 'px-4 py-12'
                  : '-mt-4 rounded-t-3xl bg-zinc-50 px-4 pt-6 pb-12'
              }
            >
              <UiCard className="mb-4 items-center py-8">
                <View className="w-14 h-14 rounded-2xl bg-zinc-100 items-center justify-center mb-3">
                  <Ionicons name="person-outline" size={28} color="#18181B" />
                </View>
                <Text className="text-xl font-bold text-zinc-900 text-center">
                  Baret Kurumsal Hesabınıza Giriş Yapın
                </Text>
                <Text className="mt-1.5 text-sm text-zinc-500 text-center leading-5 max-w-[460px]">
                  Şantiye adreslerinizi kaydetmek, toplu ihale teklifi (RFQ) toplamak, kurumsal fatura tanımlamak veya nalbur mağazası açmak için giriş yapın.
                </Text>
                <View className="mt-6 w-full max-w-[320px] gap-2.5">
                  <PrimaryButton
                    label="Giriş Yap / Kayıt Ol"
                    onPress={() => openAuthModal('login')}
                  />
                </View>
              </UiCard>

              <Pressable
                className="mb-4 flex-row items-center rounded-xl border border-zinc-200 bg-white px-4 py-3.5"
                style={ui.shadow}
                onPress={() => navigation.navigate('About')}
              >
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                  <Ionicons name="information-circle-outline" size={22} color="#18181B" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-zinc-900">Hakkında</Text>
                  <Text className="mt-0.5 text-xs text-zinc-500">
                    Platform bilgileri · lisanslar · iletişim
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
              </Pressable>
            </View>
          </View>

          {isDesktop ? (
            <WebPortalFooter
              onNavigateTab={handleNavigatePortalTab}
              onOpenAuth={openAuthModal}
            />
          ) : null}
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-zinc-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {desktopHeader}
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-between"
        keyboardShouldPersistTaps="handled"
      >
        <View>
          {!isDesktop ? (
            <BrandHero
              compact
              eyebrow="Profil & Kurumsal"
              title={user?.company_name || user?.full_name || 'Hesabım'}
              subtitle={USER_ROLE_LABELS[user?.role ?? 'buyer']}
              right={
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                  <Ionicons name="person" size={28} color="#fff" />
                </View>
              }
            />
          ) : null}

          <View
            style={{ maxWidth: 820, width: '100%', alignSelf: 'center' }}
            className={
              isDesktop
                ? 'px-4 py-8'
                : '-mt-4 rounded-t-3xl bg-zinc-50 px-4 pt-6 pb-12'
            }
          >
            {isDesktop ? (
              <View className="mb-5">
                <Text className="text-xl font-bold text-zinc-900">
                  Kurumsal Hesap & Şantiye Yönetimi
                </Text>
                <Text className="text-xs text-zinc-500 mt-0.5">
                  Firma fatura bilgilerinizi ve kayıtlı şantiye teslimat adreslerinizi buradan yönetebilirsiniz
                </Text>
              </View>
            ) : null}

            <UiCard className="mb-4">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Hesap & Kurumsal Fatura Bilgileri
                </Text>
                {!editing ? (
                  <Pressable onPress={() => setEditing(true)}>
                    <Text className="text-sm font-semibold text-amber-700">Düzenle</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={cancelEdit}>
                    <Text className="text-sm font-medium text-zinc-500">Vazgeç</Text>
                  </Pressable>
                )}
              </View>

              {editing ? (
                <>
                  <Text className="mb-1 text-sm font-semibold text-zinc-700">Ad Soyad</Text>
                  <TextInput
                    className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-zinc-900"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Adınız Soyadınız"
                    placeholderTextColor="#A1A1AA"
                  />
                  <Text className="mb-1 text-sm font-semibold text-zinc-700">Telefon</Text>
                  <TextInput
                    className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-zinc-900"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="05xxxxxxxxx"
                    placeholderTextColor="#A1A1AA"
                    keyboardType="phone-pad"
                  />
                  <Text className="mb-1 text-sm font-semibold text-zinc-700">
                    Firma / Şirket Ünvanı (Kurumsal Fatura)
                  </Text>
                  <TextInput
                    className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-zinc-900"
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="Örn: Yılmazlar İnşaat Ltd. Şti."
                    placeholderTextColor="#A1A1AA"
                  />
                  <View className="flex-row gap-2 mb-3">
                    <View className="flex-1" style={{ minWidth: 0 }}>
                      <Text className="mb-1 text-sm font-semibold text-zinc-700">
                        Vergi Dairesi
                      </Text>
                      <TextInput
                        style={{ minWidth: 0 }}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-zinc-900"
                        value={taxOffice}
                        onChangeText={setTaxOffice}
                        placeholder="Örn: Şehitkamil VD"
                        placeholderTextColor="#A1A1AA"
                      />
                    </View>
                    <View className="flex-1" style={{ minWidth: 0 }}>
                      <Text className="mb-1 text-sm font-semibold text-zinc-700">
                        Vergi No / TCKN
                      </Text>
                      <TextInput
                        style={{ minWidth: 0 }}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-zinc-900"
                        value={taxNumber}
                        onChangeText={setTaxNumber}
                        keyboardType="number-pad"
                        placeholder="10 veya 11 hane"
                        placeholderTextColor="#A1A1AA"
                      />
                    </View>
                  </View>
                  <Text className="mb-1 text-sm font-semibold text-zinc-700">E-posta</Text>
                  <Text className="mb-1 rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2.5 text-zinc-500">
                    {user?.email}
                  </Text>
                  <Text className="mb-4 text-xs text-zinc-400">
                    E-posta giriş kimliğidir; burada değiştirilemez.
                  </Text>
                  <PrimaryButton
                    label="Değişiklikleri Kaydet"
                    loading={saving}
                    onPress={() => void handleSave()}
                  />
                </>
              ) : (
                <>
                  <Text className="text-xl font-bold text-zinc-900">
                    {user?.full_name || 'İsimsiz kullanıcı'}
                  </Text>
                  <Text className="mt-1 text-sm text-zinc-500">{user?.email}</Text>
                  <Text className="mt-1 text-sm text-zinc-500">
                    {user?.phone || 'Telefon eklenmemiş'}
                  </Text>
                  {user?.company_name ? (
                    <View className="mt-3 rounded-lg bg-zinc-50 border border-zinc-200 p-3">
                      <Text className="text-xs font-bold text-zinc-800">
                        {user.company_name}
                      </Text>
                      <Text className="text-xs text-zinc-500 mt-0.5">
                        VD: {user.tax_office || '-'} · VN: {user.tax_number || '-'}
                      </Text>
                    </View>
                  ) : null}
                  <View className="mt-4 self-start rounded-md bg-zinc-100 border border-zinc-200 px-2.5 py-1">
                    <Text className="text-xs font-semibold text-zinc-800">
                      {user?.role ? USER_ROLE_LABELS[user.role] : '—'}
                    </Text>
                  </View>
                </>
              )}
            </UiCard>

            {/* Saved Construction Sites (Şantiyelerim) */}
            <UiCard className="mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Kayıtlı Şantiyelerim & Teslimat Adreslerim
                  </Text>
                  <Text className="text-xs text-zinc-400 mt-0.5">
                    Checkout sırasında tek dokunuşla şantiye seçimi sağlar
                  </Text>
                </View>
                <Pressable onPress={() => setAddingSite((v) => !v)}>
                  <Text className="text-xs font-semibold text-amber-700">
                    {addingSite ? 'Kapat' : '+ Şantiye Ekle'}
                  </Text>
                </Pressable>
              </View>

              {addingSite ? (
                <View className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 mb-3">
                  <TextInput
                    value={siteName}
                    onChangeText={setSiteName}
                    placeholder="Şantiye Adı (Örn: A Blok Kaba İnşaat)"
                    placeholderTextColor="#A1A1AA"
                    className="mb-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                  />
                  <View className="flex-row gap-2 mb-2">
                    <TextInput
                      style={{ minWidth: 0 }}
                      value={siteCity}
                      onChangeText={setSiteCity}
                      placeholder="Şehir"
                      placeholderTextColor="#A1A1AA"
                      className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                    />
                    <TextInput
                      style={{ minWidth: 0 }}
                      value={siteDistrict}
                      onChangeText={setSiteDistrict}
                      placeholder="İlçe"
                      placeholderTextColor="#A1A1AA"
                      className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                    />
                  </View>
                  <TextInput
                    value={siteAddress}
                    onChangeText={setSiteAddress}
                    placeholder="Açık şantiye adresi"
                    placeholderTextColor="#A1A1AA"
                    className="mb-2.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                  />
                  <Pressable
                    onPress={() => void handleAddSite()}
                    className="rounded-lg bg-zinc-900 py-2.5 items-center"
                  >
                    <Text className="text-xs font-semibold text-white">
                      Şantiyeyi Kaydet
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {sites.length === 0 ? (
                <Text className="text-xs text-zinc-400">
                  Henüz kayıtlı şantiye adresi eklenmemiş.
                </Text>
              ) : (
                sites.map((s) => (
                  <View
                    key={s.id}
                    className="flex-row items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3 mb-2"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-sm font-bold text-zinc-900">
                        {s.name}
                      </Text>
                      <Text className="text-xs text-zinc-500 mt-0.5">
                        {s.city}
                        {s.district ? ` / ${s.district}` : ''} — {s.address}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => void deleteBuyerSite(user.id, s.id).then(loadSites)}
                    >
                      <Text className="text-xs font-semibold text-red-600">Sil</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </UiCard>

            {user?.id ? (
              <UiCard className="mb-4">
                <NotificationsInbox userId={user.id} limit={8} />
              </UiCard>
            ) : null}

            <Pressable
              className="mb-4 flex-row items-center rounded-xl border border-zinc-200 bg-white px-4 py-3.5"
              style={ui.shadow}
              onPress={() => navigation.navigate('About')}
            >
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                <Ionicons name="information-circle-outline" size={22} color="#18181B" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-zinc-900">Hakkında</Text>
                <Text className="mt-0.5 text-xs text-zinc-500">
                  Platform bilgileri · lisanslar · iletişim
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
            </Pressable>

            <Text className="mb-4 px-1 text-xs leading-5 text-zinc-500">
              Baret — inşaat & yapı malzemeleri pazaryeri. Siparişleriniz bu hesapla bağlıdır.
              Platform dışı telefon / WhatsApp anlaşması kullanım şartlarına aykırıdır;
              tekrarlayan ihlallerde hesap askıya alınabilir.
            </Text>

            <PrimaryButton
              label="Çıkış Yap"
              variant="danger"
              loading={isSigningOut}
              disabled={editing}
              onPress={() => void handleSignOut()}
              className="mb-3"
            />

            <Pressable
              disabled={isDeletingAccount}
              onPress={handleDeleteAccount}
              className="py-3 items-center rounded-xl border border-red-200 bg-red-50/50"
            >
              <Text className="text-xs font-semibold text-red-700">
                {isDeletingAccount
                  ? 'Hesap Siliniyor...'
                  : 'Hesabımı ve Verilerimi Kalıcı Olarak Sil'}
              </Text>
            </Pressable>
          </View>
        </View>

        {isDesktop ? (
          <WebPortalFooter
            onNavigateTab={handleNavigatePortalTab}
            onOpenAuth={openAuthModal}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

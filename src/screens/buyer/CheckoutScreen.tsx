import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ScrollView as ScrollViewType,
  type TextInput as TextInputType,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DELIVERY_OPTION_LABELS } from '../../constants/enums';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { commonDeliveryOptions, createOrdersFromCart } from '../../services/orders';
import { createBuyerSite, listBuyerSites } from '../../services/rfq';
import type { BuyerSite, DeliveryOption } from '../../types/database';
import type { BuyerCartStackParamList } from '../../types/navigation.types';

type Nav = NativeStackNavigationProp<BuyerCartStackParamList, 'Checkout'>;

type PaymentMethodKey = 'bank_transfer' | 'pay_on_delivery' | 'corporate_credit';

const PAYMENT_METHODS: Array<{
  key: PaymentMethodKey;
  label: string;
  subtitle: string;
}> = [
  {
    key: 'pay_on_delivery',
    label: 'Teslimatta Nakit / Kredi Kartı (POS)',
    subtitle: 'Şantiyede veya mağazada teslim anında güvenli ödeme',
  },
  {
    key: 'bank_transfer',
    label: 'Kurumsal Havale / EFT',
    subtitle: 'Satıcı siparişi onaylayınca IBAN ve fatura bilgisi paylaşılır',
  },
  {
    key: 'corporate_credit',
    label: 'Cari Açık Hesap / Çek-Vadeli Talebi',
    subtitle: 'Sürekli çalıştığınız nalbur ile cari mutabakat kapsamında',
  },
];

export function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollViewType>(null);
  const addressRef = useRef<TextInputType>(null);
  const cityRef = useRef<TextInputType>(null);
  const districtRef = useRef<TextInputType>(null);
  const notesRef = useRef<TextInputType>(null);

  const { user, session, updateProfile } = useAuth();
  const { items, totalAmount, clearCart } = useCart();
  const options = useMemo(() => commonDeliveryOptions(items), [items]);

  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption | null>(
    options[0] ?? null
  );
  const [savedSites, setSavedSites] = useState<BuyerSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [saveAsNewSite, setSaveAsNewSite] = useState(false);
  const [siteName, setSiteName] = useState('');

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [notes, setNotes] = useState('');

  // Corporate Invoice & Payment
  const [isCorporateInvoice, setIsCorporateInvoice] = useState(
    Boolean(user?.company_name || user?.tax_number)
  );
  const [companyName, setCompanyName] = useState(user?.company_name ?? '');
  const [taxOffice, setTaxOffice] = useState(user?.tax_office ?? '');
  const [taxNumber, setTaxNumber] = useState(user?.tax_number ?? '');
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodKey>('pay_on_delivery');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setPhone((prev) => prev || user.phone || '');
    setCompanyName((prev) => prev || user.company_name || '');
    setTaxOffice((prev) => prev || user.tax_office || '');
    setTaxNumber((prev) => prev || user.tax_number || '');
    void listBuyerSites(user.id).then((sites) => {
      setSavedSites(sites);
      const def = sites.find((s) => s.is_default) ?? sites[0];
      if (def) {
        setSelectedSiteId(def.id);
        setAddress(def.address);
        setCity(def.city);
        setDistrict(def.district ?? '');
        if (def.contact_phone) setPhone(def.contact_phone);
      }
    });
  }, [user]);

  const isPickup = deliveryOption === 'gel_al';

  const fullAddress = [address.trim(), district.trim(), city.trim()]
    .filter(Boolean)
    .join(', ');

  const scrollTowardBottom = () => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 120);
    });
  };

  const applySavedSite = (site: BuyerSite) => {
    setSelectedSiteId(site.id);
    setAddress(site.address);
    setCity(site.city);
    setDistrict(site.district ?? '');
    if (site.contact_phone) setPhone(site.contact_phone);
  };

  const onSubmit = async () => {
    Keyboard.dismiss();
    if (!session || !user) {
      Alert.alert(
        'Oturum Gerekli',
        'Sepetinizdeki ürünleri siparişe dönüştürmek için lütfen giriş yapın veya ücretsiz hesap oluşturun.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Giriş Yap / Kayıt Ol',
            onPress: () =>
              (navigation.getParent()?.getParent() as any)?.navigate('Auth'),
          },
        ]
      );
      return;
    }
    if (items.length === 0) {
      Alert.alert('Sepet', 'Sepet boş.');
      return;
    }
    if (!deliveryOption) {
      Alert.alert('Teslimat', 'Teslimat yöntemi seç.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Telefon', 'İletişim telefonu gerekli.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Adres', 'Teslim / iletişim adresi gerekli.');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Şehir', 'Şehir bilgisini gir.');
      return;
    }
    if (isCorporateInvoice && (!companyName.trim() || !taxNumber.trim())) {
      Alert.alert(
        'Kurumsal Fatura',
        'Kurumsal fatura için Firma Ünvanı ve Vergi / TCKN numarası zorunludur.'
      );
      return;
    }

    setSubmitting(true);
    try {
      // Save jobsite if requested
      if (saveAsNewSite && siteName.trim()) {
        await createBuyerSite({
          buyerId: user.id,
          name: siteName.trim(),
          city: city.trim(),
          district: district.trim() || null,
          address: address.trim(),
          contactName: user.full_name,
          contactPhone: phone.trim(),
          isDefault: savedSites.length === 0,
        }).catch(() => undefined);
      }

      // Persist corporate invoice fields to profile
      if (isCorporateInvoice) {
        await updateProfile({
          full_name: user.full_name ?? '',
          phone: phone.trim(),
          company_name: companyName.trim(),
          tax_office: taxOffice.trim(),
          tax_number: taxNumber.trim(),
        }).catch(() => undefined);
      }

      const deliveryAddress = isPickup
        ? `Gel-al · Tel: ${phone.trim()} · Adres: ${fullAddress}`
        : `${fullAddress} · Tel: ${phone.trim()}`;

      const paymentLabel =
        PAYMENT_METHODS.find((m) => m.key === paymentMethod)?.label ??
        paymentMethod;

      const invoiceMeta = isCorporateInvoice
        ? `[Fatura: Kurumsal - ${companyName.trim()} | VD: ${taxOffice.trim() || '-'} | VN: ${taxNumber.trim()}]`
        : '[Fatura: Bireysel]';

      const combinedNotes = [
        `[Ödeme: ${paymentLabel}]`,
        invoiceMeta,
        notes.trim() || null,
      ]
        .filter(Boolean)
        .join(' · ');

      const created = await createOrdersFromCart({
        buyerId: user.id,
        items,
        deliveryOption,
        deliveryAddress,
        notes: combinedNotes,
      });

      const orderTotal = created.reduce(
        (sum, row) => sum + Number(row.total_amount),
        0
      );
      clearCart();
      const units = created.reduce((sum, row) => sum + Number(row.quantity), 0);
      Alert.alert(
        'Sipariş alındı',
        `${created.length} kalem · ${units} birim sipariş oluşturuldu.\nToplam ₺${orderTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n\nStok sipariş anında düşürüldü. Satıcı kabul edince iletişim açılır.`,
        [
          {
            text: 'Siparişlerim',
            onPress: () => {
              (navigation.getParent() as any)?.navigate('Orders');
              navigation.navigate('CartList');
            },
          },
          {
            text: 'Tamam',
            onPress: () => navigation.navigate('CartList'),
          },
        ]
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Sipariş oluşturulamadı.';
      Alert.alert('Hata', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 px-6">
        <Text className="mb-2 text-lg font-semibold text-stone-900">Sepet boş</Text>
        <Pressable
          className="rounded-xl bg-brand px-5 py-3"
          onPress={() => navigation.navigate('CartList')}
        >
          <Text className="font-semibold text-white">Sepete dön</Text>
        </Pressable>
      </View>
    );
  }

  // Guest guard banner
  if (!session || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3] px-6">
        <View className="w-full max-w-[440px] rounded-3xl border border-orange-200 bg-white p-6 items-center shadow-sm">
          <Ionicons name="lock-closed-outline" size={44} color="#EA580C" />
          <Text className="mt-3 text-xl font-extrabold text-stone-900 text-center">
            Siparişi Tamamlamak İçin Giriş Yapın
          </Text>
          <Text className="mt-1.5 text-sm text-stone-500 text-center leading-5">
            Sepetinizdeki {items.length} kalem ürün korunuyor. Giriş yaptıktan veya kayıt olduktan sonra hemen şantiye adresinizi seçip siparişi onaylayabilirsiniz.
          </Text>
          <Pressable
            onPress={() =>
              (navigation.getParent()?.getParent() as any)?.navigate('Auth')
            }
            className="mt-5 w-full rounded-2xl bg-brand py-4 items-center"
          >
            <Text className="text-base font-bold text-white">
              Giriş Yap / Ücretsiz Kayıt Ol
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const footerPad = Math.max(insets.bottom, 12);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-stone-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="px-4 py-4 pb-8"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ maxWidth: 820, width: '100%', alignSelf: 'center' }}>
          <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Sipariş Özeti
          </Text>
          <View className="mb-4 rounded-2xl border border-stone-200 bg-white p-4">
            <Text className="mb-2 text-sm font-semibold text-stone-600">
              {items.length} kalem · {items[0].storeName}
            </Text>
            {items.map((item) => (
              <View key={item.productId} className="mb-2 flex-row justify-between">
                <Text className="flex-1 pr-2 text-sm text-stone-800" numberOfLines={1}>
                  {item.name} × {item.quantity} {item.unit ?? 'adet'}
                </Text>
                <Text className="text-sm font-bold text-brand">
                  ₺{(item.price * item.quantity).toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </View>
            ))}
            <View className="mt-2 border-t border-stone-100 pt-2 flex-row justify-between items-center">
              <Text className="text-sm font-semibold text-stone-600">
                Genel Toplam (KDV Dahil)
              </Text>
              <Text className="text-lg font-black text-stone-900">
                ₺{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Teslimat Yöntemi
          </Text>
          {options.length === 0 ? (
            <Text className="mb-4 text-sm text-red-600">
              Ortak teslimat seçeneği yok. Sepeti kontrol et.
            </Text>
          ) : (
            <View className="mb-4 flex-row flex-wrap gap-2">
              {options.map((option) => {
                const selected = deliveryOption === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setDeliveryOption(option)}
                    className={`rounded-full border px-4 py-2.5 ${
                      selected
                        ? 'border-brand bg-orange-50'
                        : 'border-stone-200 bg-white'
                    }`}
                  >
                    <Text
                      className={`text-sm ${selected ? 'font-semibold text-brand' : 'text-stone-700'}`}
                    >
                      {DELIVERY_OPTION_LABELS[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Saved Construction Sites Selector */}
          {savedSites.length > 0 ? (
            <View className="mb-4">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Kayıtlı Şantiyelerim (Hızlı Seçim)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {savedSites.map((site) => {
                    const active = selectedSiteId === site.id;
                    return (
                      <Pressable
                        key={site.id}
                        onPress={() => applySavedSite(site)}
                        className={`rounded-2xl border p-3 min-w-[200px] ${
                          active
                            ? 'border-brand bg-orange-50'
                            : 'border-stone-200 bg-white'
                        }`}
                      >
                        <Text className="text-xs font-extrabold text-stone-900">
                          🏗️ {site.name}
                        </Text>
                        <Text className="text-[11px] text-stone-500 mt-0.5" numberOfLines={1}>
                          {site.city}
                          {site.district ? ` / ${site.district}` : ''} — {site.address}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ) : null}

          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Şantiye / Teslimat Adresi & İletişim
          </Text>

          <FieldLabel text="Şantiye / Alıcı Telefonu *" />
          <TextInput
            className="mb-4 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900"
            placeholder="05xx xxx xx xx"
            placeholderTextColor="#a8a29e"
            keyboardType="phone-pad"
            returnKeyType="next"
            value={phone}
            onChangeText={setPhone}
            onSubmitEditing={() => addressRef.current?.focus()}
          />

          <FieldLabel text="Açık Adres / Şantiye Tarifi *" />
          <TextInput
            ref={addressRef}
            className="mb-4 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900"
            placeholder="Mahalle, sokak, ada/parsel veya şantiye kapı no"
            placeholderTextColor="#a8a29e"
            value={address}
            onChangeText={setAddress}
            multiline
            returnKeyType="next"
            onFocus={scrollTowardBottom}
            onSubmitEditing={() => cityRef.current?.focus()}
          />

          <View className="mb-3 flex-row gap-2">
            <View className="flex-1">
              <FieldLabel text="Şehir *" />
              <TextInput
                ref={cityRef}
                className="rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900"
                placeholder="Örn. Gaziantep"
                placeholderTextColor="#a8a29e"
                value={city}
                onChangeText={setCity}
                returnKeyType="next"
                onFocus={scrollTowardBottom}
                onSubmitEditing={() => districtRef.current?.focus()}
              />
            </View>
            <View className="flex-1">
              <FieldLabel text="İlçe" />
              <TextInput
                ref={districtRef}
                className="rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900"
                placeholder="Örn. Şehitkamil"
                placeholderTextColor="#a8a29e"
                value={district}
                onChangeText={setDistrict}
                returnKeyType="next"
                onFocus={scrollTowardBottom}
                onSubmitEditing={() => notesRef.current?.focus()}
              />
            </View>
          </View>

          {/* Save as new jobsite */}
          <Pressable
            onPress={() => setSaveAsNewSite((v) => !v)}
            className="mb-3 flex-row items-center"
          >
            <Ionicons
              name={saveAsNewSite ? 'checkbox' : 'square-outline'}
              size={20}
              color={saveAsNewSite ? '#EA580C' : '#94A3B8'}
            />
            <Text className="ml-2 text-xs font-bold text-stone-700">
              Bu adresi “Kayıtlı Şantiyelerim” listesine kaydet
            </Text>
          </Pressable>
          {saveAsNewSite ? (
            <TextInput
              value={siteName}
              onChangeText={setSiteName}
              placeholder="Şantiye Adı (Örn: Kuzeyşehir B Blok Şantiyesi)"
              placeholderTextColor="#a8a29e"
              className="mb-4 rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm text-stone-900"
            />
          ) : null}

          {/* Corporate Invoice Toggle */}
          <View className="mb-4 rounded-2xl border border-stone-200 bg-white p-4">
            <Pressable
              onPress={() => setIsCorporateInvoice((v) => !v)}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <Feather name="file-text" size={17} color="#EA580C" />
                <View className="ml-2.5">
                  <Text className="text-sm font-bold text-stone-900">
                    Kurumsal Fatura İstiyorum (Şirket / Müteahhitlik)
                  </Text>
                  <Text className="text-xs text-stone-500">
                    E-Fatura / E-Arşiv için vergi bilgilerinizi ekleyin
                  </Text>
                </View>
              </View>
              <Ionicons
                name={isCorporateInvoice ? 'checkbox' : 'square-outline'}
                size={22}
                color={isCorporateInvoice ? '#EA580C' : '#94A3B8'}
              />
            </Pressable>

            {isCorporateInvoice ? (
              <View className="mt-3 pt-3 border-t border-stone-100">
                <FieldLabel text="Firma / Şirket Ünvanı *" />
                <TextInput
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="Örn: Yılmazlar İnşaat Taahhüt San. ve Tic. Ltd. Şti."
                  placeholderTextColor="#a8a29e"
                  className="mb-3 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-3 text-sm text-stone-900"
                />
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <FieldLabel text="Vergi Dairesi" />
                    <TextInput
                      value={taxOffice}
                      onChangeText={setTaxOffice}
                      placeholder="Örn: Gazikent VD"
                      placeholderTextColor="#a8a29e"
                      className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-3 text-sm text-stone-900"
                    />
                  </View>
                  <View className="flex-1">
                    <FieldLabel text="Vergi No / TCKN *" />
                    <TextInput
                      value={taxNumber}
                      onChangeText={setTaxNumber}
                      keyboardType="number-pad"
                      placeholder="10 veya 11 haneli"
                      placeholderTextColor="#a8a29e"
                      className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-3 text-sm text-stone-900"
                    />
                  </View>
                </View>
              </View>
            ) : null}
          </View>

          {/* Payment Method Selector */}
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Ödeme Tercihi
          </Text>
          <View className="mb-4 gap-2">
            {PAYMENT_METHODS.map((pm) => {
              const active = paymentMethod === pm.key;
              return (
                <Pressable
                  key={pm.key}
                  onPress={() => setPaymentMethod(pm.key)}
                  className={`rounded-2xl border p-3.5 flex-row items-center justify-between ${
                    active
                      ? 'border-brand bg-orange-50/70'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-bold text-stone-900">
                      {pm.label}
                    </Text>
                    <Text className="text-xs text-stone-500 mt-0.5">
                      {pm.subtitle}
                    </Text>
                  </View>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? '#EA580C' : '#94A3B8'}
                  />
                </Pressable>
              );
            })}
          </View>

          <FieldLabel text="Sipariş / Sevkiyat Notu (İsteğe Bağlı)" />
          <TextInput
            ref={notesRef}
            className="mb-2 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900"
            placeholder="Vinç talebi, şantiye şefi adı, teslim saati vb."
            placeholderTextColor="#a8a29e"
            value={notes}
            onChangeText={setNotes}
            multiline
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
            onFocus={scrollTowardBottom}
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>
      </ScrollView>

      <View
        className="border-t border-stone-200 bg-white px-4 pt-3"
        style={{ paddingBottom: footerPad }}
      >
        <View style={{ maxWidth: 820, width: '100%', alignSelf: 'center' }}>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm text-stone-600">Ödenecek Toplam</Text>
            <Text className="text-lg font-bold text-stone-900">
              ₺{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <Pressable
            className={`items-center rounded-2xl py-4 ${
              submitting || options.length === 0 ? 'bg-stone-300' : 'bg-brand'
            }`}
            disabled={submitting || options.length === 0}
            onPress={() => void onSubmit()}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-bold text-white">
                Siparişi Onayla ve Oluştur
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <Text className="mb-1.5 text-sm font-semibold text-stone-700">{text}</Text>
  );
}


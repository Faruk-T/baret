import { useMemo, useRef, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DELIVERY_OPTION_LABELS } from '../../constants/enums';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { commonDeliveryOptions, createOrdersFromCart } from '../../services/orders';
import type { DeliveryOption } from '../../types/database';
import type { BuyerCartStackParamList } from '../../types/navigation.types';

type Nav = NativeStackNavigationProp<BuyerCartStackParamList, 'Checkout'>;

export function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollViewType>(null);
  const addressRef = useRef<TextInputType>(null);
  const cityRef = useRef<TextInputType>(null);
  const districtRef = useRef<TextInputType>(null);
  const notesRef = useRef<TextInputType>(null);

  const { user } = useAuth();
  const { items, totalAmount, clearCart } = useCart();
  const options = useMemo(() => commonDeliveryOptions(items), [items]);

  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption | null>(
    options[0] ?? null
  );
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const onSubmit = async () => {
    Keyboard.dismiss();
    if (!user) {
      Alert.alert('Oturum', 'Sipariş için giriş yapmalısın.');
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

    setSubmitting(true);
    try {
      const deliveryAddress = isPickup
        ? `Gel-al · Tel: ${phone.trim()} · Adres: ${fullAddress}`
        : `${fullAddress} · Tel: ${phone.trim()}`;

      const orderTotal = totalAmount;
      const created = await createOrdersFromCart({
        buyerId: user.id,
        items,
        deliveryOption,
        deliveryAddress,
        notes: notes.trim() || null,
      });

      clearCart();
      const units = items.reduce((sum, item) => sum + item.quantity, 0);
      Alert.alert(
        'Sipariş alındı',
        `${created.length} kalem · ${units} adet sipariş oluşturuldu.\nToplam ₺${orderTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n\nStok sipariş anında düşürüldü. Satıcı kabul edince iletişim açılır.`,
        [
          {
            text: 'Siparişlerim',
            onPress: () => {
              navigation.getParent()?.navigate('Orders' as never);
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
        contentContainerClassName="px-4 py-4 pb-6"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Özet
        </Text>
        <View className="mb-4 rounded-2xl border border-stone-200 bg-white p-4">
          <Text className="mb-2 text-sm text-stone-600">
            {items.length} ürün · {items[0].storeName}
          </Text>
          {items.map((item) => (
            <View key={item.productId} className="mb-2 flex-row justify-between">
              <Text className="flex-1 pr-2 text-sm text-stone-800" numberOfLines={1}>
                {item.name} × {item.quantity}
              </Text>
              <Text className="text-sm font-medium text-brand">
                ₺{(item.price * item.quantity).toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
          ))}
          <View className="mt-2 border-t border-stone-100 pt-2">
            <Text className="text-base font-bold text-stone-900">
              Toplam: ₺
              {totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Teslimat
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

        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
          İletişim & adres
        </Text>
        <Text className="mb-3 text-xs leading-4 text-stone-500">
          {isPickup
            ? 'Mağazadan teslimde de telefon ve adres zorunlu (iletişim / fatura). Ürünü mağazadan alırsın.'
            : 'Ürünün geleceği adres ve telefon zorunlu. Satıcı siparişi kabul edince mağaza iletişimi Siparişlerim’de açılır.'}
        </Text>

        <FieldLabel text="Telefon *" />
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

        <FieldLabel text="Adres *" />
        <TextInput
          ref={addressRef}
          className="mb-4 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900"
          placeholder="Mahalle, sokak, bina no"
          placeholderTextColor="#a8a29e"
          value={address}
          onChangeText={setAddress}
          multiline
          returnKeyType="next"
          onFocus={scrollTowardBottom}
          onSubmitEditing={() => cityRef.current?.focus()}
        />

        <View className="mb-4 flex-row gap-2">
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

        <FieldLabel text="Sipariş notu (isteğe bağlı)" />
        <TextInput
          ref={notesRef}
          className="mb-2 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900"
          placeholder="Kapı kodu, teslim saati vb."
          placeholderTextColor="#a8a29e"
          value={notes}
          onChangeText={setNotes}
          multiline
          returnKeyType="done"
          blurOnSubmit
          onFocus={scrollTowardBottom}
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <View className="h-4" />
      </ScrollView>

      <View
        className="border-t border-stone-200 bg-white px-4 pt-3"
        style={{ paddingBottom: footerPad }}
      >
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm text-stone-600">Ödenecek</Text>
          <Text className="text-lg font-bold text-stone-900">
            ₺
            {totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
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
            <Text className="text-base font-bold text-white">Siparişi oluştur</Text>
          )}
        </Pressable>
        <Pressable className="mt-2 py-1" onPress={() => Keyboard.dismiss()}>
          <Text className="text-center text-xs font-medium text-stone-400">
            Klavyeyi kapat
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <Text className="mb-1.5 text-sm font-semibold text-stone-700">{text}</Text>
  );
}

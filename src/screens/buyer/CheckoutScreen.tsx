import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DELIVERY_OPTION_LABELS } from '../../constants/enums';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { commonDeliveryOptions, createOrdersFromCart } from '../../services/orders';
import type { DeliveryOption } from '../../types/database';
import type { BuyerCartStackParamList } from '../../types/navigation.types';

type Nav = NativeStackNavigationProp<BuyerCartStackParamList, 'Checkout'>;

export function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
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

  const needsAddress =
    deliveryOption === 'kargo' || deliveryOption === 'aracla_teslim';

  const fullAddress = [address.trim(), district.trim(), city.trim()]
    .filter(Boolean)
    .join(', ');

  const onSubmit = async () => {
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
    if (needsAddress && !fullAddress) {
      Alert.alert('Adres', 'Adres, şehir bilgisini doldur.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Telefon', 'İletişim telefonu gerekli.');
      return;
    }

    setSubmitting(true);
    try {
      const deliveryAddress = needsAddress
        ? `${fullAddress} · Tel: ${phone.trim()}`
        : `Gel-al · Tel: ${phone.trim()}${fullAddress ? ` · ${fullAddress}` : ''}`;

      const orderTotal = totalAmount;
      const created = await createOrdersFromCart({
        buyerId: user.id,
        items,
        deliveryOption,
        deliveryAddress,
        notes: notes.trim() || null,
      });

      clearCart();
      Alert.alert(
        'Sipariş alındı',
        `${created.length} kalem sipariş oluşturuldu. Toplam ₺${orderTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
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

  return (
    <ScrollView className="flex-1 bg-stone-50" contentContainerClassName="px-4 py-4 pb-10">
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
                className={`rounded-full border px-3 py-2 ${
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
        Bu bilgiler teslimat içindir. Mağaza telefonu ürün sayfasında görünmez;
        satıcı siparişi kabul edince Siparişlerim’de açılır. Platform dışı
        WhatsApp anlaşması yasaktır.
      </Text>
      <TextInput
        className="mb-3 rounded-xl border border-stone-200 bg-white px-3 py-3 text-stone-900"
        placeholder="Telefon *"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <TextInput
        className="mb-3 rounded-xl border border-stone-200 bg-white px-3 py-3 text-stone-900"
        placeholder={needsAddress ? 'Adres *' : 'Adres (isteğe bağlı)'}
        value={address}
        onChangeText={setAddress}
        multiline
      />
      <View className="mb-3 flex-row gap-2">
        <TextInput
          className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-3 text-stone-900"
          placeholder={needsAddress ? 'Şehir *' : 'Şehir'}
          value={city}
          onChangeText={setCity}
        />
        <TextInput
          className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-3 text-stone-900"
          placeholder="İlçe"
          value={district}
          onChangeText={setDistrict}
        />
      </View>
      <TextInput
        className="mb-6 rounded-xl border border-stone-200 bg-white px-3 py-3 text-stone-900"
        placeholder="Sipariş notu (isteğe bağlı)"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

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
    </ScrollView>
  );
}

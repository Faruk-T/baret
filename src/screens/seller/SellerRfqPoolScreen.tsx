import { useCallback, useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../../context/AuthContext';
import {
  listOpenRfqsForSeller,
  submitRfqQuote,
  type RfqRequestWithQuotes,
} from '../../services/rfq';
import { getMyStore } from '../../services/stores';
import type { Store } from '../../types/database';
import { formatTRY } from '../../utils/format';

/**
 * Seller RFQ Pool Screen (Şantiye İhale & Teklif Havuzu).
 * Allows approved hardware stores to view regional material quote requests and submit competitive bids.
 */
export function SellerRfqPoolScreen() {
  const { user } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [rfqs, setRfqs] = useState<RfqRequestWithQuotes[]>([]);
  const [onlyMyCity, setOnlyMyCity] = useState(false);
  const [loading, setLoading] = useState(true);

  // Active quote form state
  const [quotingRfqId, setQuotingRfqId] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('1');
  const [deliveryIncluded, setDeliveryIncluded] = useState(true);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const myStore = await getMyStore(user.id);
      setStore(myStore);
      const list = await listOpenRfqsForSeller(
        onlyMyCity && myStore?.city ? myStore.city : undefined
      );
      setRfqs(list);
    } catch {
      setRfqs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, onlyMyCity]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleSendQuote = async (rfqId: string) => {
    if (!store) {
      Alert.alert('Mağaza Gerekli', 'Teklif vermek için önce mağaza oluşturmalısınız.');
      return;
    }
    const parsedTotal = Number(totalAmount.replace(',', '.'));
    const parsedDays = Math.max(1, parseInt(estimatedDays, 10) || 1);

    if (Number.isNaN(parsedTotal) || parsedTotal <= 0) {
      Alert.alert('Geçersiz Tutar', 'Lütfen geçerli bir toplam teklif tutarı (₺) girin.');
      return;
    }

    try {
      setSubmitting(true);
      await submitRfqQuote({
        rfqId,
        storeId: store.id,
        storeName: store.name,
        storeCity: store.city,
        storePhone: store.phone,
        totalAmount: parsedTotal,
        deliveryIncluded,
        estimatedDays: parsedDays,
        notes: quoteNotes,
      });
      setQuotingRfqId(null);
      setTotalAmount('');
      setQuoteNotes('');
      await load();
      Alert.alert(
        'Teklif Gönderildi',
        'Fiyat teklifiniz şantiye alıcısına iletildi. Alıcı onayladığında sipariş/iletişim bilgileriniz eşleşir.'
      );
    } catch (error) {
      Alert.alert(
        'Hata',
        error instanceof Error ? error.message : 'Teklif gönderilemedi.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F3]">
        <ActivityIndicator size="large" color="#EA580C" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#FFF8F3]" contentContainerClassName="p-4 pb-12">
      <View style={{ maxWidth: 1080, width: '100%', alignSelf: 'center' }}>
        {/* Header Card */}
        <View className="rounded-3xl bg-slate-950 p-5 mb-4 border border-slate-800">
          <View className="flex-row items-center justify-between flex-wrap gap-3">
            <View className="flex-1">
              <Text className="text-orange-400 text-xs font-extrabold uppercase tracking-wider">
                B2B SATICI İHALE HAVUZU
              </Text>
              <Text className="text-white text-xl font-black mt-1">
                Açık Şantiye Malzeme Taleplerine Teklif Verin
              </Text>
              <Text className="text-slate-400 text-xs mt-1">
                Müteahhitlerin ve şantiyelerin yayınladığı toplu malzeme listelerine doğrudan fiyat vererek yüksek hacimli satış yakalayın.
              </Text>
            </View>

            {store?.city ? (
              <Pressable
                onPress={() => setOnlyMyCity((v) => !v)}
                className={`flex-row items-center px-4 py-2.5 rounded-xl border ${
                  onlyMyCity
                    ? 'bg-orange-600 border-orange-500'
                    : 'bg-slate-900 border-slate-700'
                }`}
              >
                <Feather name="map-pin" size={14} color="#FFFFFF" />
                <Text className="text-white text-xs font-bold ml-2">
                  {onlyMyCity ? `Sadece ${store.city}` : 'Tüm Türkiye İhaleleri'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {rfqs.length === 0 ? (
          <View className="rounded-3xl border border-stone-200 bg-white p-8 items-center">
            <Ionicons name="document-text-outline" size={44} color="#94A3B8" />
            <Text className="mt-3 text-base font-bold text-stone-900">
              Şu an açık şantiye ihalesi bulunmuyor
            </Text>
            <Text className="mt-1 text-xs text-stone-500 text-center max-w-[380px]">
              Alıcılar yeni malzeme listesi yayınladığında burada anında listelenir.
            </Text>
          </View>
        ) : (
          rfqs.map((rfq) => {
            const myQuote = store
              ? rfq.quotes.find((q) => q.store_id === store.id)
              : null;
            const isQuoting = quotingRfqId === rfq.id;

            return (
              <View
                key={rfq.id}
                className="rounded-3xl border border-stone-200 bg-white p-5 mb-4 shadow-sm"
              >
                <View className="flex-row items-start justify-between gap-2 mb-3">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <View className="bg-orange-100 px-2.5 py-0.5 rounded-full">
                        <Text className="text-[11px] font-extrabold text-orange-800">
                          📍 {rfq.city}
                          {rfq.district ? ` / ${rfq.district}` : ''}
                        </Text>
                      </View>
                      <Text className="text-xs text-stone-400">
                        {new Date(rfq.created_at).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                    <Text className="text-lg font-extrabold text-stone-900">
                      {rfq.title}
                    </Text>
                    {rfq.delivery_address ? (
                      <Text className="text-xs text-stone-500 mt-0.5">
                        Teslimat Bölgesi: {rfq.delivery_address}
                      </Text>
                    ) : null}
                  </View>

                  {myQuote ? (
                    <View className="bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl items-end">
                      <Text className="text-[10px] font-extrabold text-emerald-800">
                        TEKLİFİNİZ VERİLDİ
                      </Text>
                      <Text className="text-sm font-black text-emerald-900">
                        {formatTRY(Number(myQuote.total_amount))}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Line Items */}
                <View className="rounded-2xl bg-stone-50 border border-stone-200/80 p-3.5 mb-3">
                  <Text className="text-[11px] font-extrabold uppercase text-stone-500 mb-2">
                    İstenen Malzemeler ({rfq.items.length} Kalem)
                  </Text>
                  {rfq.items.map((item, idx) => (
                    <View
                      key={idx}
                      className="flex-row items-center justify-between py-1 border-b border-stone-200/50 last:border-b-0"
                    >
                      <Text className="text-xs font-semibold text-stone-800 flex-1">
                        • {item.name}
                      </Text>
                      <Text className="text-xs font-extrabold text-orange-600 ml-2">
                        {item.quantity} {item.unit}
                      </Text>
                    </View>
                  ))}
                  {rfq.notes ? (
                    <Text className="text-xs text-stone-600 mt-2 italic">
                      Alıcı Notu: “{rfq.notes}”
                    </Text>
                  ) : null}
                </View>

                {/* Quote Form or Action Button */}
                {isQuoting ? (
                  <View className="rounded-2xl border border-orange-200 bg-orange-50/40 p-4 mt-2">
                    <Text className="text-sm font-extrabold text-stone-900 mb-3">
                      Fiyat Teklifi Hazırla
                    </Text>

                    <View className="flex-row gap-3 mb-3">
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-stone-700 mb-1">
                          Toplam Teklif Tutarı (₺ KDV Dahil) *
                        </Text>
                        <TextInput
                          value={totalAmount}
                          onChangeText={setTotalAmount}
                          keyboardType="decimal-pad"
                          placeholder="Örn: 48500"
                          placeholderTextColor="#94A3B8"
                          className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-bold text-stone-900"
                        />
                      </View>
                      <View className="w-36">
                        <Text className="text-xs font-bold text-stone-700 mb-1">
                          Sevk Süresi (Gün)
                        </Text>
                        <TextInput
                          value={estimatedDays}
                          onChangeText={setEstimatedDays}
                          keyboardType="number-pad"
                          placeholder="1"
                          className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-bold text-stone-900 text-center"
                        />
                      </View>
                    </View>

                    <Pressable
                      onPress={() => setDeliveryIncluded((v) => !v)}
                      className="flex-row items-center mb-3"
                    >
                      <Ionicons
                        name={deliveryIncluded ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={deliveryIncluded ? '#EA580C' : '#64748B'}
                      />
                      <Text className="text-xs font-bold text-stone-800 ml-2">
                        Şantiyeye nakliye / araçla teslimat fiyata dahildir
                      </Text>
                    </Pressable>

                    <Text className="text-xs font-bold text-stone-700 mb-1">
                      Teklif Notu (Marka, Ödeme Vadesi vb.)
                    </Text>
                    <TextInput
                      value={quoteNotes}
                      onChangeText={setQuoteNotes}
                      placeholder="Örn: Tüm ürünler stoktan aynı gün sevk edilir, nakliye dahildir."
                      placeholderTextColor="#94A3B8"
                      className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 mb-3"
                    />

                    <View className="flex-row justify-end gap-2">
                      <Pressable
                        onPress={() => setQuotingRfqId(null)}
                        className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white"
                      >
                        <Text className="text-xs font-bold text-stone-700">
                          Vazgeç
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={submitting}
                        onPress={() => void handleSendQuote(rfq.id)}
                        className="px-5 py-2.5 rounded-xl bg-orange-600"
                      >
                        {submitting ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text className="text-xs font-extrabold text-white">
                            Teklifi Gönder
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-stone-500">
                      Toplam {rfq.quotes.length} mağaza teklif verdi
                    </Text>
                    <Pressable
                      onPress={() => {
                        setQuotingRfqId(rfq.id);
                        setTotalAmount(
                          myQuote ? String(myQuote.total_amount) : ''
                        );
                        setEstimatedDays(
                          myQuote ? String(myQuote.delivery_days) : '1'
                        );
                        setDeliveryIncluded(true);
                        setQuoteNotes(myQuote?.note ?? '');
                      }}
                      className="bg-orange-600 px-4 py-2.5 rounded-xl flex-row items-center"
                    >
                      <Feather name="send" size={13} color="#FFFFFF" />
                      <Text className="text-white text-xs font-extrabold ml-1.5">
                        {myQuote ? 'Teklifimi Güncelle' : 'Fiyat Teklifi Ver'}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

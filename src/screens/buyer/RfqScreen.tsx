import { useCallback, useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { WebPortalFooter } from '../../components/layout/WebPortalFooter';
import {
  WebPortalHeader,
  type WebPortalActiveTab,
} from '../../components/layout/WebPortalHeader';
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '../../constants/categories';
import { useAuth } from '../../context/AuthContext';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import {
  acceptRfqQuote,
  createRfqRequest,
  listBuyerRfqs,
  type RfqRequestWithQuotes,
} from '../../services/rfq';
import type { RfqLineItem } from '../../types/database';
import { formatTRY } from '../../utils/format';
import { usePageSeo } from '../../utils/seo';

export function RfqScreen() {
  const navigation = useNavigation<any>();
  const { user, session } = useAuth();
  const { isDesktop } = useResponsiveLayout();

  usePageSeo({
    title: 'Şantiye Malzeme İhalesi & Toplu Teklif (RFQ) | Baret',
    description:
      'Çimento, demir, alçıpan ve yapı malzemeleri listelerinizi yayınlayın, Türkiye genelindeki onaylı yapı marketlerden toplu fiyat teklifi toplayın.',
    canonicalPath: '/rfq',
  });

  const [rfqs, setRfqs] = useState<RfqRequestWithQuotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<RfqLineItem[]>([
    { name: '', category: 'Çimento & Harç', quantity: 50, unit: 'torba' },
  ]);

  const load = useCallback(async () => {
    if (!user?.id) {
      setRfqs([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await listBuyerRfqs(user.id);
      setRfqs(data);
    } catch {
      setRfqs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { name: '', category: PRODUCT_CATEGORIES[0], quantity: 10, unit: 'adet' },
    ]);
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, patch: Partial<RfqLineItem>) => {
    setLines((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, ...patch } : line))
    );
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    const rootNav = navigation.getParent() as any;
    if (rootNav) {
      rootNav.navigate('Auth', {
        screen: mode === 'register' ? 'RoleSelect' : 'Login',
      });
    }
  };

  const handlePortalTab = (tab: WebPortalActiveTab) => {
    if (tab === 'catalog' || tab === 'quick_order') {
      navigation.navigate('Home');
    } else if (tab === 'rfq') {
      // already here
    } else if (tab === 'orders') {
      navigation.navigate('Orders');
    } else if (tab === 'profile') {
      navigation.navigate('Profile');
    }
  };

  const handleSubmitRfq = async () => {
    if (!session || !user) {
      Alert.alert(
        'Giriş gerekli',
        'Şantiye ihalesi / toplu fiyat teklifi talebi açmak için lütfen giriş yapın.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Giriş Yap',
            onPress: () => openAuthModal('login'),
          },
        ]
      );
      return;
    }

    const validLines = lines.filter(
      (l) => l.name.trim().length > 0 && l.quantity > 0
    );
    if (!title.trim()) {
      Alert.alert('Eksik bilgi', 'İhale / şantiye talep başlığı girin.');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Eksik bilgi', 'Teslimat şehri girin.');
      return;
    }
    if (validLines.length === 0) {
      Alert.alert('Eksik bilgi', 'En az 1 malzeme kalemi girin.');
      return;
    }

    try {
      setSubmitting(true);
      await createRfqRequest({
        buyerId: user.id,
        title,
        city,
        district,
        deliveryAddress,
        items: validLines,
        notes,
      });
      setTitle('');
      setNotes('');
      setLines([
        { name: '', category: 'Çimento & Harç', quantity: 50, unit: 'torba' },
      ]);
      setCreating(false);
      await load();
      Alert.alert(
        'İhale Yayınlandı',
        'Malzeme listeniz bölgedeki onaylı nalburların teklif havuzuna düştü. Gelen fiyat tekliflerini bu ekrandan karşılaştırıp onaylayabilirsiniz.'
      );
    } catch (error) {
      Alert.alert(
        'Hata',
        error instanceof Error ? error.message : 'Talep oluşturulamadı.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptQuote = (
    rfqId: string,
    quoteId: string,
    storeName: string
  ) => {
    Alert.alert(
      'Teklifi Onayla',
      `${storeName} mağazasının fiyat teklifini kabul etmek istiyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Teklifi Kabul Et',
          onPress: () => {
            void (async () => {
              await acceptRfqQuote(rfqId, quoteId);
              await load();
              Alert.alert(
                'Teklif Onaylandı',
                'Satıcı teklifiniz onaylandı olarak işaretlendi. Sevkiyat detayları için mağaza ile iletişime geçebilirsiniz.'
              );
            })();
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      {isDesktop ? (
        <WebPortalHeader
          activeTab="rfq"
          onSelectTab={handlePortalTab}
          onOpenCart={() => navigation.navigate('Cart')}
          onOpenAuth={openAuthModal}
        />
      ) : null}

      <ScrollView className="flex-1" contentContainerClassName="pb-12">
        {/* Clean Executive Page Header */}
        <View className="bg-white px-6 py-6 border-b border-zinc-200">
          <View
            style={{ maxWidth: 1200, width: '100%', alignSelf: 'center' }}
            className="flex-row items-center justify-between flex-wrap gap-4"
          >
            <View className="flex-1 min-w-[260px]">
              <Text className="text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
                Kurumsal Satınalma & Şantiye İhalesi (RFQ)
              </Text>
              <Text className="text-zinc-900 text-2xl font-extrabold">
                Malzeme Listesi Yayınlayın, Tedarikçilerden Teklif Toplayın
              </Text>
              <Text className="text-zinc-500 text-xs mt-1 leading-5 max-w-[680px]">
                Çimento, demir, alçıpan, boya ve tüm şantiye kalemlerinizi tek
                listede yayınlayın; bölgenizdeki onaylı yapı marketlerin
                verdiği fiyat ve teslim süresi tekliflerini karşılaştırın.
              </Text>
            </View>

            <Pressable
              onPress={() => {
                if (!session) {
                  openAuthModal('login');
                  return;
                }
                setCreating((v) => !v);
              }}
              className="flex-row items-center bg-zinc-900 px-5 py-3 rounded-xl"
            >
              <Feather
                name={creating ? 'x' : 'plus'}
                size={16}
                color="#FFFFFF"
              />
              <Text className="text-white text-xs font-bold ml-2">
                {creating ? 'Formu Kapat' : 'Yeni Teklif Talebi Oluştur'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={{ maxWidth: 1200, width: '100%', alignSelf: 'center' }}
          className="px-6 pt-6"
        >
          {/* Create RFQ Form */}
          {creating ? (
            <View className="rounded-2xl border border-zinc-200 bg-white p-6 mb-6">
              <Text className="text-base font-bold text-zinc-900 mb-1">
                Yeni Şantiye Malzeme İhalesi Oluştur
              </Text>
              <Text className="text-xs text-zinc-500 mb-4">
                Kalemlerinizi ekleyin, onaylı tedarikçiler toplam fiyat ve
                teslim süresi teklifi versin.
              </Text>

              <Text className="text-xs font-semibold text-zinc-700 mb-1.5">
                İhale / Proje Başlığı *
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Örn: Şehitkamil 24 Daire Kaba İnşaat Çimento & Demir Alımı"
                placeholderTextColor="#A1A1AA"
                style={{ minWidth: 0 }}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 mb-3"
              />

              <View className="flex-row gap-3 mb-3">
                <View className="flex-1" style={{ minWidth: 0 }}>
                  <Text className="text-xs font-semibold text-zinc-700 mb-1.5">
                    Şehir *
                  </Text>
                  <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="Örn: İstanbul, Gaziantep"
                    placeholderTextColor="#A1A1AA"
                    style={{ minWidth: 0 }}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900"
                  />
                </View>
                <View className="flex-1" style={{ minWidth: 0 }}>
                  <Text className="text-xs font-semibold text-zinc-700 mb-1.5">
                    İlçe
                  </Text>
                  <TextInput
                    value={district}
                    onChangeText={setDistrict}
                    placeholder="Örn: Tuzla, Şehitkamil"
                    placeholderTextColor="#A1A1AA"
                    style={{ minWidth: 0 }}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900"
                  />
                </View>
              </View>

              <Text className="text-xs font-semibold text-zinc-700 mb-1.5">
                Şantiye Teslimat Adresi
              </Text>
              <TextInput
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="Mahalle, cadde, ada/parsel veya şantiye adı"
                placeholderTextColor="#A1A1AA"
                style={{ minWidth: 0 }}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 mb-4"
              />

              {/* Material Line Items */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                  İstenen Malzeme Kalemleri ({lines.length})
                </Text>
                <Pressable
                  onPress={addLine}
                  className="flex-row items-center bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg"
                >
                  <Feather name="plus" size={14} color="#18181B" />
                  <Text className="text-xs font-semibold text-zinc-800 ml-1">
                    Kalem Ekle
                  </Text>
                </Pressable>
              </View>

              {lines.map((line, idx) => (
                <View
                  key={idx}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 mb-2.5"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-bold text-zinc-700">
                      #{idx + 1}. Malzeme Kalemi
                    </Text>
                    {lines.length > 1 ? (
                      <Pressable onPress={() => removeLine(idx)}>
                        <Text className="text-xs font-semibold text-red-600">
                          Sil
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <View className={isDesktop ? 'flex-row gap-2' : 'gap-2'}>
                    <TextInput
                      value={line.name}
                      onChangeText={(v) => updateLine(idx, { name: v })}
                      placeholder="Malzeme adı & özellik (Örn: CEM I 42.5 Portland Çimento 50kg)"
                      placeholderTextColor="#A1A1AA"
                      style={{ minWidth: 0 }}
                      className="flex-[2] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                    />
                    <View className="flex-row gap-2 flex-1" style={{ minWidth: 0 }}>
                      <TextInput
                        value={String(line.quantity)}
                        onChangeText={(v) =>
                          updateLine(idx, {
                            quantity: Math.max(
                              1,
                              parseInt(v.replace(/[^0-9]/g, ''), 10) || 1
                            ),
                          })
                        }
                        keyboardType="number-pad"
                        placeholder="Miktar"
                        style={{ minWidth: 0 }}
                        className="w-24 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-900 text-center"
                      />
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="flex-1"
                      >
                        <View className="flex-row items-center gap-1">
                          {PRODUCT_UNITS.slice(0, 6).map((u) => (
                            <Pressable
                              key={u}
                              onPress={() => updateLine(idx, { unit: u })}
                              className={`px-2.5 py-2 rounded-lg border ${
                                line.unit === u
                                  ? 'bg-zinc-900 border-zinc-900'
                                  : 'bg-white border-zinc-200'
                              }`}
                            >
                              <Text
                                className={`text-xs font-semibold ${
                                  line.unit === u
                                    ? 'text-white'
                                    : 'text-zinc-700'
                                }`}
                              >
                                {u}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                </View>
              ))}

              <Text className="text-xs font-semibold text-zinc-700 mt-2 mb-1.5">
                Ödeme / Sevkiyat Notu (İsteğe Bağlı)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Örn: Vinçli kamyonla şantiye sahasına indirme dahil fiyat veriniz, faturalı havale."
                placeholderTextColor="#A1A1AA"
                multiline
                style={{ minWidth: 0 }}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 mb-4"
              />

              <Pressable
                disabled={submitting}
                onPress={() => void handleSubmitRfq()}
                className="bg-zinc-900 rounded-xl py-3.5 items-center"
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-sm font-bold">
                    İhaleyi Yayınla ve Teklif Toplamaya Başla
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {/* Guest Prompt */}
          {!session ? (
            <View className="rounded-2xl border border-zinc-200 bg-white p-10 items-center my-2">
              <View className="w-12 h-12 rounded-xl bg-zinc-100 items-center justify-center mb-3">
                <Feather name="file-text" size={22} color="#18181B" />
              </View>
              <Text className="text-lg font-bold text-zinc-900 text-center">
                Şantiye İhale & Teklif Sistemini Kullanmak İçin Giriş Yapın
              </Text>
              <Text className="text-xs text-zinc-500 text-center mt-1.5 max-w-[460px] leading-5">
                Ücretsiz kurumsal veya bireysel alıcı hesabınızla malzeme
                listesi yayınlayabilir, onaylı tedarikçilerden toplu iskonto
                teklifi alabilirsiniz.
              </Text>
              <View className="flex-row items-center gap-3 mt-5">
                <Pressable
                  onPress={() => openAuthModal('login')}
                  className="bg-zinc-900 px-5 py-2.5 rounded-xl"
                >
                  <Text className="text-white text-xs font-semibold">
                    Giriş Yap
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => openAuthModal('register')}
                  className="border border-zinc-300 bg-white px-5 py-2.5 rounded-xl"
                >
                  <Text className="text-zinc-900 text-xs font-semibold">
                    Ücretsiz Kayıt Ol
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : loading ? (
            <View className="py-16 items-center">
              <ActivityIndicator size="large" color="#18181B" />
            </View>
          ) : rfqs.length === 0 ? (
            <View className="rounded-2xl border border-zinc-200 bg-white p-10 items-center">
              <Ionicons name="layers-outline" size={38} color="#A1A1AA" />
              <Text className="text-base font-bold text-zinc-900 mt-3">
                Henüz açık şantiye ihaleniz yok
              </Text>
              <Text className="text-xs text-zinc-500 text-center mt-1 max-w-[420px] leading-5">
                Toplu malzeme alımlarınızda tek tek sepete eklemek yerine
                malzeme listesi yayınlayıp tedarikçilerden teklif
                toplayabilirsiniz.
              </Text>
              <Pressable
                onPress={() => setCreating(true)}
                className="mt-4 bg-zinc-900 px-5 py-2.5 rounded-xl"
              >
                <Text className="text-white text-xs font-semibold">
                  + İlk İhale Talebini Oluştur
                </Text>
              </Pressable>
            </View>
          ) : (
            rfqs.map((rfq) => (
              <View
                key={rfq.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 mb-4"
              >
                <View className="flex-row items-start justify-between gap-2 mb-3">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <View
                        className={`px-2.5 py-0.5 rounded-md ${
                          rfq.status === 'closed'
                            ? 'bg-emerald-50 border border-emerald-200'
                            : rfq.quotes.length > 0
                              ? 'bg-amber-50 border border-amber-200'
                              : 'bg-zinc-100'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            rfq.status === 'closed'
                              ? 'text-emerald-800'
                              : rfq.quotes.length > 0
                                ? 'text-amber-800'
                                : 'text-zinc-700'
                          }`}
                        >
                          {rfq.status === 'closed'
                            ? 'TAMAMLANDI / TEKLİF ONAYLANDI'
                            : rfq.quotes.length > 0
                              ? `${rfq.quotes.length} TEKLİF GELDİ`
                              : 'TEKLİFLER BEKLENİYOR'}
                        </Text>
                      </View>
                      <Text className="text-xs text-zinc-400">
                        {new Date(rfq.created_at).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                    <Text className="text-base font-bold text-zinc-900">
                      {rfq.title}
                    </Text>
                    <Text className="text-xs text-zinc-500 mt-0.5">
                      {rfq.city}
                      {rfq.district ? ` / ${rfq.district}` : ''}
                      {rfq.delivery_address ? ` — ${rfq.delivery_address}` : ''}
                    </Text>
                  </View>
                </View>

                {/* Requested Line Items */}
                <View className="bg-zinc-50 rounded-xl p-3.5 border border-zinc-200/80 mb-3">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                    Malzeme Listesi ({rfq.items.length} Kalem)
                  </Text>
                  {rfq.items.map((item, i) => (
                    <View
                      key={i}
                      className="flex-row items-center justify-between py-1 border-b border-zinc-200/60 last:border-b-0"
                    >
                      <Text className="text-xs font-medium text-zinc-800 flex-1">
                        • {item.name}
                      </Text>
                      <Text className="text-xs font-bold text-zinc-900 ml-2">
                        {item.quantity} {item.unit}
                      </Text>
                    </View>
                  ))}
                  {rfq.notes ? (
                    <Text className="text-xs text-zinc-500 mt-2 italic">
                      Not: {rfq.notes}
                    </Text>
                  ) : null}
                </View>

                {/* Incoming Seller Quotes */}
                <Text className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
                  Gelen Tedarikçi Teklifleri ({rfq.quotes.length})
                </Text>
                {rfq.quotes.length === 0 ? (
                  <View className="rounded-xl bg-zinc-50 border border-zinc-200 p-3">
                    <Text className="text-xs text-zinc-600">
                      Bölgedeki onaylı tedarikçiler malzeme listenizi inceliyor.
                      Teklif geldiğinde burada karşılaştırmalı olarak
                      listelenir.
                    </Text>
                  </View>
                ) : (
                  rfq.quotes.map((q) => (
                    <View
                      key={q.id}
                      className={`rounded-xl border p-3.5 mb-2 flex-row items-center justify-between flex-wrap gap-3 ${
                        q.status === 'accepted'
                          ? 'border-emerald-400 bg-emerald-50/40'
                          : 'border-zinc-200 bg-white'
                      }`}
                    >
                      <View className="flex-1 min-w-[200px]">
                        <Text className="text-sm font-bold text-zinc-900">
                          {q.stores?.name || 'Onaylı Tedarikçi Mağaza'}
                        </Text>
                        <Text className="text-xs text-zinc-500 mt-0.5">
                          Tahmini sevk süresi: {q.delivery_days} gün
                        </Text>
                        {q.note ? (
                          <Text className="text-xs text-zinc-600 mt-1">
                            “{q.note}”
                          </Text>
                        ) : null}
                        {q.status === 'accepted' && q.stores?.phone ? (
                          <Text className="text-xs font-bold text-emerald-700 mt-1">
                            Mağaza İletişim: {q.stores.phone}
                          </Text>
                        ) : null}
                      </View>

                      <View className="items-end">
                        <Text className="text-lg font-extrabold text-zinc-900">
                          {formatTRY(Number(q.total_amount))}
                        </Text>
                        {q.status === 'accepted' ? (
                          <View className="bg-emerald-700 px-3 py-1 rounded-lg mt-1">
                            <Text className="text-white text-xs font-semibold">
                              ✓ Kabul Edildi
                            </Text>
                          </View>
                        ) : rfq.status !== 'closed' ? (
                          <Pressable
                            onPress={() =>
                              handleAcceptQuote(
                                rfq.id,
                                q.id,
                                q.stores?.name || 'Mağaza'
                              )
                            }
                            className="bg-zinc-900 px-3.5 py-2 rounded-lg mt-1.5"
                          >
                            <Text className="text-white text-xs font-semibold">
                              Teklifi Onayla
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </View>
            ))
          )}
        </View>

        {isDesktop ? (
          <WebPortalFooter
            onNavigateTab={handlePortalTab}
            onOpenAuth={openAuthModal}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

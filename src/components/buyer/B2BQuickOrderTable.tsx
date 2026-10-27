import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  CartStoreConflictError,
  useCart,
  type CartProductInput,
} from '../../context/CartContext';
import { DELIVERY_OPTION_LABELS } from '../../constants/enums';
import type { CatalogProduct } from '../../services/catalog';
import {
  normalizeBulkTiers,
  resolveEffectiveUnitPrice,
} from '../../utils/pricing';

type Props = {
  products: CatalogProduct[];
  onPressProduct: (productId: string) => void;
};

/**
 * High-density B2B Quick-Order Table for Construction Buyers & Engineers.
 */
export function B2BQuickOrderTable({ products, onPressProduct }: Props) {
  const { addItem, clearCart, items } = useCart();
  const [qtyMap, setQtyMap] = useState<Record<string, string>>({});

  const getQty = (p: CatalogProduct): number => {
    const raw = qtyMap[p.id];
    const min = Math.max(1, p.min_order_qty ?? 1);
    if (raw === undefined) return min;
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) || parsed < 1 ? min : parsed;
  };

  const stepQty = (p: CatalogProduct, delta: number) => {
    const min = Math.max(1, p.min_order_qty ?? 1);
    const current = getQty(p);
    const next = Math.max(min, Math.min(p.stock || 9999, current + delta));
    setQtyMap((prev) => ({ ...prev, [p.id]: String(next) }));
  };

  const toCartInput = (p: CatalogProduct): CartProductInput => ({
    id: p.id,
    store_id: p.store_id,
    storeName: p.store.name,
    name: p.name,
    price: Number(p.price),
    image_url: p.image_url,
    stock: p.stock,
    delivery_options: p.delivery_options,
    unit: p.unit ?? 'adet',
    min_order_qty: p.min_order_qty ?? 1,
    bulk_pricing: p.bulk_pricing ?? [],
  });

  const handleQuickAdd = (p: CatalogProduct) => {
    const qty = getQty(p);
    try {
      addItem(toCartInput(p), qty);
    } catch (error) {
      if (error instanceof CartStoreConflictError) {
        Alert.alert('Farklı tedarikçi mağazası', error.message, [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Sepeti sıfırla ve ekle',
            style: 'destructive',
            onPress: () => {
              clearCart();
              addItem(toCartInput(p), qty);
            },
          },
        ]);
        return;
      }
      Alert.alert(
        'Sepet',
        error instanceof Error ? error.message : 'Sepete eklenemedi.'
      );
    }
  };

  return (
    <View className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Table Top Info Bar */}
      <View className="bg-zinc-50 border-b border-zinc-200 px-5 py-3.5 flex-row items-center justify-between flex-wrap gap-2">
        <View className="flex-row items-center">
          <Feather name="list" size={15} color="#18181B" />
          <Text className="text-zinc-900 text-xs font-bold ml-2">
            Toplu Sipariş & Kademeli Birim Fiyat Tablosu
          </Text>
        </View>
        <Text className="text-zinc-500 text-xs">
          Miktar arttıkça kademeli toptan birim fiyat otomatik uygulanır
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ minWidth: 980, width: '100%' }}>
          {/* Column Headers */}
          <View className="flex-row items-center bg-zinc-100/70 border-b border-zinc-200 px-5 py-2.5">
            <Text
              style={{ width: 280 }}
              className="text-[11px] font-bold uppercase tracking-wider text-zinc-500"
            >
              Malzeme / SKU / Marka
            </Text>
            <Text
              style={{ width: 170 }}
              className="text-[11px] font-bold uppercase tracking-wider text-zinc-500"
            >
              Tedarikçi / Bölge
            </Text>
            <Text
              style={{ width: 190 }}
              className="text-[11px] font-bold uppercase tracking-wider text-zinc-500"
            >
              Kademeli Toptan Fiyatlar
            </Text>
            <Text
              style={{ width: 95 }}
              className="text-[11px] font-bold uppercase tracking-wider text-zinc-500"
            >
              Stok
            </Text>
            <Text
              style={{ width: 145 }}
              className="text-[11px] font-bold uppercase tracking-wider text-zinc-500"
            >
              Sipariş Miktarı
            </Text>
            <Text
              style={{ width: 110 }}
              className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-right"
            >
              Sepet
            </Text>
          </View>

          {/* Rows */}
          {products.map((p, idx) => {
            const qty = getQty(p);
            const tiers = normalizeBulkTiers(p.bulk_pricing);
            const effectiveUnit = resolveEffectiveUnitPrice(
              Number(p.price),
              qty,
              tiers
            );
            const hasDiscount = effectiveUnit < Number(p.price);
            const inCart = items.find((i) => i.productId === p.id);
            const unitLabel = p.unit ?? 'adet';

            return (
              <View
                key={p.id}
                className={`flex-row items-center px-5 py-3.5 border-b border-zinc-100 ${
                  idx % 2 === 1 ? 'bg-zinc-50/40' : 'bg-white'
                }`}
              >
                {/* Product Info */}
                <Pressable
                  style={{ width: 280 }}
                  onPress={() => onPressProduct(p.id)}
                  className="flex-row items-center pr-3"
                >
                  {p.image_url ? (
                    <Image
                      source={{ uri: p.image_url }}
                      className="w-11 h-11 rounded-lg bg-zinc-100 mr-3"
                    />
                  ) : (
                    <View className="w-11 h-11 rounded-lg bg-zinc-100 items-center justify-center mr-3">
                      <Feather name="package" size={16} color="#71717A" />
                    </View>
                  )}
                  <View className="flex-1">
                    <Text
                      className="text-xs font-bold text-zinc-900 leading-4"
                      numberOfLines={2}
                    >
                      {p.name}
                    </Text>
                    <View className="flex-row items-center flex-wrap gap-1.5 mt-1">
                      {p.brand ? (
                        <Text className="text-[10px] font-bold text-amber-700">
                          {p.brand}
                        </Text>
                      ) : null}
                      {p.sku ? (
                        <Text className="text-[10px] font-mono text-zinc-400">
                          {p.sku}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>

                {/* Store & Delivery */}
                <View style={{ width: 170 }} className="pr-2">
                  <Text
                    className="text-xs font-semibold text-zinc-800"
                    numberOfLines={1}
                  >
                    {p.store.name}
                  </Text>
                  <Text className="text-[11px] text-zinc-500 mt-0.5">
                    {p.store.city}
                    {p.store.district ? ` / ${p.store.district}` : ''}
                  </Text>
                  <View className="flex-row flex-wrap gap-1 mt-1">
                    {p.delivery_options.slice(0, 1).map((opt) => (
                      <View
                        key={opt}
                        className="bg-zinc-100 px-1.5 py-0.5 rounded"
                      >
                        <Text className="text-[9px] font-semibold text-zinc-600">
                          {DELIVERY_OPTION_LABELS[opt]}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Bulk Pricing Tiers */}
                <View style={{ width: 190 }} className="pr-2">
                  <Text className="text-xs font-bold text-zinc-900">
                    Liste: ₺
                    {Number(p.price).toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    / {unitLabel}
                  </Text>
                  {tiers.length > 0 ? (
                    <View className="mt-1 gap-0.5">
                      {tiers.map((t) => (
                        <View
                          key={t.min_qty}
                          className={`flex-row items-center px-1.5 py-0.5 rounded ${
                            qty >= t.min_qty
                              ? 'bg-emerald-50 border border-emerald-300'
                              : 'bg-zinc-100'
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-semibold ${
                              qty >= t.min_qty
                                ? 'text-emerald-800'
                                : 'text-zinc-600'
                            }`}
                          >
                            {t.min_qty}+ {unitLabel}: ₺
                            {t.unit_price.toLocaleString('tr-TR', {
                              minimumFractionDigits: 2,
                            })}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text className="text-[10px] text-zinc-400 mt-0.5">
                      Sabit birim fiyat
                    </Text>
                  )}
                </View>

                {/* Stock */}
                <View style={{ width: 95 }} className="pr-2">
                  <Text
                    className={`text-xs font-bold ${
                      p.stock > 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {p.stock > 0 ? `${p.stock} ${unitLabel}` : 'Tükendi'}
                  </Text>
                  {(p.min_order_qty ?? 1) > 1 ? (
                    <Text className="text-[10px] text-zinc-500 mt-0.5">
                      Min: {p.min_order_qty} {unitLabel}
                    </Text>
                  ) : null}
                </View>

                {/* Inline Qty Input & Effective Total */}
                <View style={{ width: 145 }} className="pr-2">
                  <View className="flex-row items-center">
                    <Pressable
                      onPress={() => stepQty(p, -1)}
                      className="w-7 h-8 rounded-l-lg border border-zinc-300 bg-zinc-50 items-center justify-center"
                    >
                      <Feather name="minus" size={12} color="#18181B" />
                    </Pressable>
                    <TextInput
                      value={
                        qtyMap[p.id] ?? String(Math.max(1, p.min_order_qty ?? 1))
                      }
                      onChangeText={(val) =>
                        setQtyMap((prev) => ({
                          ...prev,
                          [p.id]: val.replace(/[^0-9]/g, ''),
                        }))
                      }
                      keyboardType="number-pad"
                      style={{ minWidth: 0 }}
                      className="w-14 h-8 border-t border-b border-zinc-300 bg-white px-1 text-center text-xs font-bold text-zinc-900"
                    />
                    <Pressable
                      onPress={() => stepQty(p, 1)}
                      className="w-7 h-8 rounded-r-lg border border-zinc-300 bg-zinc-50 items-center justify-center"
                    >
                      <Feather name="plus" size={12} color="#18181B" />
                    </Pressable>
                  </View>
                  <Text
                    className={`text-[11px] font-bold mt-1 ${
                      hasDiscount ? 'text-emerald-700' : 'text-zinc-700'
                    }`}
                  >
                    Toplam: ₺
                    {(effectiveUnit * qty).toLocaleString('tr-TR', {
                      maximumFractionDigits: 0,
                    })}
                  </Text>
                </View>

                {/* Action */}
                <View style={{ width: 110 }} className="items-end">
                  <Pressable
                    onPress={() => handleQuickAdd(p)}
                    disabled={p.stock <= 0}
                    className={`flex-row items-center px-3 py-2 rounded-lg ${
                      p.stock <= 0
                        ? 'bg-zinc-200'
                        : inCart
                          ? 'bg-emerald-700'
                          : 'bg-zinc-900'
                    }`}
                  >
                    <Feather
                      name={inCart ? 'check' : 'shopping-cart'}
                      size={13}
                      color="#FFFFFF"
                    />
                    <Text className="text-white text-xs font-semibold ml-1.5">
                      {inCart ? `Sepette (${inCart.quantity})` : 'Ekle'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

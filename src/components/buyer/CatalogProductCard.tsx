import { Feather } from '@expo/vector-icons';
import { Alert, Image, Pressable, Text, View } from 'react-native';

import {
  CartStoreConflictError,
  useCart,
  type CartProductInput,
} from '../../context/CartContext';
import { DELIVERY_OPTION_LABELS } from '../../constants/enums';
import type { CatalogProduct } from '../../services/catalog';
import { normalizeBulkTiers } from '../../utils/pricing';

type Props = {
  product: CatalogProduct;
  onPress?: () => void;
  gridMode?: boolean;
};

export function CatalogProductCard({
  product,
  onPress,
  gridMode = false,
}: Props) {
  const { addItem, clearCart, items } = useCart();
  const unitLabel = product.unit ?? 'adet';
  const minQty = Math.max(1, product.min_order_qty ?? 1);
  const bulkTiers = normalizeBulkTiers(product.bulk_pricing);
  const lowestTierPrice =
    bulkTiers.length > 0
      ? Math.min(...bulkTiers.map((t) => t.unit_price))
      : null;
  const highestTierMinQty =
    bulkTiers.length > 0
      ? bulkTiers.reduce((prev, curr) =>
          curr.unit_price < prev.unit_price ? curr : prev
        ).min_qty
      : null;

  const inCartItem = items.find((i) => i.productId === product.id);

  const handleQuickAddToCart = () => {
    const cartInput: CartProductInput = {
      id: product.id,
      store_id: product.store_id,
      storeName: product.store.name,
      name: product.name,
      price: Number(product.price),
      image_url: product.image_url,
      stock: product.stock,
      delivery_options: product.delivery_options,
      unit: unitLabel,
      min_order_qty: minQty,
      bulk_pricing: product.bulk_pricing ?? [],
    };

    try {
      addItem(cartInput, minQty);
    } catch (error) {
      if (error instanceof CartStoreConflictError) {
        Alert.alert('Farklı tedarikçi mağazası', error.message, [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Sepeti sıfırla ve ekle',
            style: 'destructive',
            onPress: () => {
              clearCart();
              addItem(cartInput, minQty);
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

  if (gridMode) {
    return (
      <Pressable
        onPress={onPress}
        className="flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white justify-between"
      >
        <View>
          {/* Product Image Container */}
          <View className="relative border-b border-zinc-100">
            {product.image_url ? (
              <Image
                source={{ uri: product.image_url }}
                className="h-44 w-full bg-zinc-100"
                resizeMode="cover"
              />
            ) : (
              <View className="h-44 w-full items-center justify-center bg-zinc-100">
                <Feather name="package" size={28} color="#71717A" />
              </View>
            )}

            {/* Top Left Category Pill */}
            {product.category ? (
              <View className="absolute top-2.5 left-2.5 rounded-md bg-zinc-900/85 px-2.5 py-1">
                <Text className="text-[10px] font-semibold text-white">
                  {product.category}
                </Text>
              </View>
            ) : null}

            {/* Top Right Bulk Discount Badge */}
            {bulkTiers.length > 0 ? (
              <View className="absolute top-2.5 right-2.5 rounded-md bg-emerald-700 px-2 py-1">
                <Text className="text-[10px] font-bold text-white">
                  Toptan İskontolu
                </Text>
              </View>
            ) : null}
          </View>

          {/* Product Details */}
          <View className="p-4">
            <View className="flex-row items-center justify-between mb-1">
              <Text
                className="text-[11px] font-bold uppercase tracking-wide text-amber-700"
                numberOfLines={1}
              >
                {product.brand || 'Standart Seri'}
              </Text>
              {product.sku ? (
                <Text className="text-[10px] font-mono text-zinc-400">
                  {product.sku}
                </Text>
              ) : null}
            </View>

            <Text
              className="text-sm font-bold text-zinc-900 leading-5 min-h-[40px]"
              numberOfLines={2}
            >
              {product.name}
            </Text>

            {/* Store & Region */}
            <View className="mt-2.5 flex-row items-center">
              <Feather name="check-circle" size={12} color="#10B981" />
              <Text
                className="text-xs text-zinc-600 font-medium ml-1.5 flex-1"
                numberOfLines={1}
              >
                {product.store.name}
              </Text>
            </View>
            <View className="mt-1 flex-row items-center justify-between">
              <Text className="text-[11px] text-zinc-500">
                {product.store.city}
                {product.store.district ? ` / ${product.store.district}` : ''}
              </Text>
              <Text className="text-[11px] font-medium text-zinc-500">
                Stok: {product.stock} {unitLabel}
              </Text>
            </View>

            {/* Pricing Box */}
            <View className="mt-3 rounded-lg bg-zinc-50 border border-zinc-200/80 p-2.5">
              <View className="flex-row items-baseline justify-between">
                <View className="flex-row items-baseline">
                  <Text className="text-lg font-extrabold text-zinc-900">
                    ₺
                    {Number(product.price).toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                  <Text className="text-xs text-zinc-500 font-medium ml-1">
                    / {unitLabel}
                  </Text>
                </View>
                {minQty > 1 ? (
                  <Text className="text-[10px] font-semibold text-zinc-500">
                    Min. {minQty} {unitLabel}
                  </Text>
                ) : null}
              </View>

              {lowestTierPrice != null && highestTierMinQty != null ? (
                <View className="mt-1 pt-1 border-t border-zinc-200/70 flex-row items-center justify-between">
                  <Text className="text-[11px] font-medium text-emerald-800">
                    {highestTierMinQty}+ {unitLabel} alımda:
                  </Text>
                  <Text className="text-xs font-extrabold text-emerald-700">
                    ₺
                    {lowestTierPrice.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    / {unitLabel}
                  </Text>
                </View>
              ) : (
                <Text className="text-[11px] text-zinc-400 mt-0.5">
                  KDV (%{product.vat_rate ?? 20}) dahil birim liste fiyatı
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Bottom Action Footer */}
        <View className="px-4 pb-3.5 pt-2 border-t border-zinc-100 flex-row items-center justify-between gap-2">
          <View className="flex-row flex-wrap gap-1 flex-1">
            {product.delivery_options.slice(0, 1).map((option) => (
              <View
                key={option}
                className="rounded-md bg-zinc-100 px-2 py-1"
              >
                <Text className="text-[10px] font-semibold text-zinc-700">
                  {DELIVERY_OPTION_LABELS[option]}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              handleQuickAddToCart();
            }}
            disabled={product.stock <= 0}
            className={`flex-row items-center rounded-lg px-3 py-2 ${
              product.stock <= 0
                ? 'bg-zinc-200'
                : inCartItem
                  ? 'bg-emerald-700'
                  : 'bg-zinc-900'
            }`}
          >
            <Feather
              name={inCartItem ? 'check' : 'shopping-cart'}
              size={13}
              color="#FFFFFF"
            />
            <Text className="text-xs font-semibold text-white ml-1.5">
              {inCartItem
                ? `Sepette (${inCartItem.quantity})`
                : 'Sepete Ekle'}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    );
  }

  // Mobile List Card
  return (
    <Pressable
      className="mb-3 overflow-hidden rounded-xl border border-zinc-200 bg-white"
      onPress={onPress}
    >
      <View className="flex-row p-3.5">
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            className="mr-3.5 h-24 w-24 rounded-lg bg-zinc-100"
            resizeMode="cover"
          />
        ) : (
          <View className="mr-3.5 h-24 w-24 items-center justify-center rounded-lg bg-zinc-100">
            <Feather name="package" size={22} color="#71717A" />
          </View>
        )}
        <View className="flex-1 justify-center">
          <View className="flex-row items-center gap-1.5 mb-1">
            {product.category ? (
              <Text className="text-[11px] font-semibold text-zinc-500">
                {product.category}
              </Text>
            ) : null}
            {bulkTiers.length > 0 ? (
              <View className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5">
                <Text className="text-[9px] font-bold text-emerald-800">
                  TOPTAN İSKONTO
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            className="mb-1 text-sm font-bold text-zinc-900 leading-5"
            numberOfLines={2}
          >
            {product.name}
          </Text>
          <View className="mb-1 flex-row items-baseline gap-1">
            <Text className="text-base font-extrabold text-zinc-900">
              ₺
              {Number(product.price).toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
              })}
            </Text>
            <Text className="text-xs text-zinc-500">/ {unitLabel}</Text>
          </View>
          <Text className="text-xs text-zinc-500" numberOfLines={1}>
            {product.store.name} · {product.store.city}
          </Text>
          <View className="mt-2 flex-row flex-wrap items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <View className="rounded bg-zinc-100 px-2 py-0.5">
                <Text className="text-[11px] font-medium text-zinc-700">
                  Stok: {product.stock} {unitLabel}
                </Text>
              </View>
              {product.delivery_options.slice(0, 1).map((option) => (
                <View
                  key={option}
                  className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5"
                >
                  <Text className="text-[10px] font-semibold text-amber-800">
                    {DELIVERY_OPTION_LABELS[option]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

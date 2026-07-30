import { Image, Pressable, Text, View } from 'react-native';

import { DELIVERY_OPTION_LABELS } from '../../constants/enums';
import type { CatalogProduct } from '../../services/catalog';

type Props = {
  product: CatalogProduct;
  onPress?: () => void;
};

export function CatalogProductCard({ product, onPress }: Props) {
  return (
    <Pressable
      className="mb-3 overflow-hidden rounded-2xl border border-stone-200 bg-white"
      onPress={onPress}
      style={{
        shadowColor: '#1c1917',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View className="flex-row p-3">
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            className="mr-3 h-24 w-24 rounded-xl bg-stone-100"
            resizeMode="cover"
          />
        ) : (
          <View className="mr-3 h-24 w-24 items-center justify-center rounded-xl bg-orange-50">
            <Text className="text-xs font-medium text-brand">Görsel yok</Text>
          </View>
        )}
        <View className="flex-1 justify-center">
          <Text
            className="mb-1 text-base font-semibold text-stone-900"
            numberOfLines={2}
          >
            {product.name}
          </Text>
          <Text className="mb-1 text-lg font-bold text-brand">
            ₺
            {Number(product.price).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
            })}
          </Text>
          <Text className="text-xs text-stone-500" numberOfLines={1}>
            {product.store.name} · {product.store.city}
            {product.store.district ? ` / ${product.store.district}` : ''}
          </Text>
          <View className="mt-2 flex-row flex-wrap items-center">
            <View className="mr-2 rounded-full bg-stone-100 px-2 py-0.5">
              <Text className="text-[11px] font-medium text-stone-600">
                Stok {product.stock}
              </Text>
            </View>
            {product.delivery_options.slice(0, 2).map((option) => (
              <View
                key={option}
                className="mr-1 rounded-full bg-orange-50 px-2 py-0.5"
              >
                <Text className="text-[11px] font-medium text-brand">
                  {DELIVERY_OPTION_LABELS[option]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View className="h-1 bg-orange-100" />
    </Pressable>
  );
}

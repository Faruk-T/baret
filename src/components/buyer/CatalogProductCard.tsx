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
      className="mb-3 flex-row rounded-2xl border border-gray-100 bg-gray-50 p-3"
      onPress={onPress}
    >
      {product.image_url ? (
        <Image
          source={{ uri: product.image_url }}
          className="mr-3 h-20 w-20 rounded-xl bg-gray-200"
          resizeMode="cover"
        />
      ) : (
        <View className="mr-3 h-20 w-20 items-center justify-center rounded-xl bg-gray-200">
          <Text className="text-xs text-gray-500">Görsel yok</Text>
        </View>
      )}
      <View className="flex-1">
        <Text className="mb-1 text-base font-semibold text-gray-900" numberOfLines={2}>
          {product.name}
        </Text>
        <Text className="mb-1 text-sm font-medium text-brand">
          ₺{Number(product.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
        </Text>
        <Text className="text-xs text-gray-500" numberOfLines={1}>
          {product.store.name} · {product.store.city}
          {product.store.district ? ` / ${product.store.district}` : ''}
        </Text>
        <Text className="mt-1 text-xs text-gray-400">
          Stok: {product.stock}
          {product.delivery_options.length > 0
            ? ` · ${product.delivery_options.map((o) => DELIVERY_OPTION_LABELS[o]).join(', ')}`
            : ''}
        </Text>
      </View>
    </Pressable>
  );
}

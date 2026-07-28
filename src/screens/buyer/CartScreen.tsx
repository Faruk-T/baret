import { Alert, FlatList, Image, Pressable, Text, View } from 'react-native';

import { useCart } from '../../context/CartContext';

export function CartScreen() {
  const { items, removeItem, updateQuantity, clearCart, totalAmount, itemCount } = useCart();

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="mb-2 text-lg font-semibold text-gray-900">Sepetin boş</Text>
        <Text className="text-center text-sm text-gray-500">
          Ana Sayfa’dan ürün seçip sepete ekleyebilirsin.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3">
        <Text className="text-sm text-gray-600">
          {itemCount} ürün · {items[0]?.storeName}
        </Text>
        <Pressable onPress={clearCart}>
          <Text className="text-sm font-medium text-red-600">Sepeti temizle</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        contentContainerClassName="px-4 py-3"
        renderItem={({ item }) => (
          <View className="mb-3 flex-row rounded-2xl border border-gray-100 bg-gray-50 p-3">
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                className="mr-3 h-16 w-16 rounded-xl bg-gray-200"
                resizeMode="cover"
              />
            ) : (
              <View className="mr-3 h-16 w-16 items-center justify-center rounded-xl bg-gray-200">
                <Text className="text-xs text-gray-500">Yok</Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="mb-1 text-base font-semibold text-gray-900" numberOfLines={2}>
                {item.name}
              </Text>
              <Text className="mb-2 text-sm text-brand">
                ₺{item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </Text>
              <View className="flex-row items-center">
                <Pressable
                  className="h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white"
                  onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                >
                  <Text>−</Text>
                </Pressable>
                <Text className="mx-3 font-semibold text-gray-900">{item.quantity}</Text>
                <Pressable
                  className="h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white"
                  onPress={() => {
                    try {
                      updateQuantity(item.productId, item.quantity + 1);
                    } catch (error) {
                      const message =
                        error instanceof Error ? error.message : 'Miktar güncellenemedi.';
                      Alert.alert('Stok', message);
                    }
                  }}
                >
                  <Text>+</Text>
                </Pressable>
                <Pressable className="ml-auto" onPress={() => removeItem(item.productId)}>
                  <Text className="text-sm font-medium text-red-600">Kaldır</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      <View className="border-t border-gray-100 px-4 py-4">
        <Text className="mb-3 text-lg font-semibold text-gray-900">
          Toplam: ₺{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
        </Text>
        <Text className="text-xs text-gray-500">
          Sipariş / checkout bir sonraki pakette (Gün 16).
        </Text>
      </View>
    </View>
  );
}

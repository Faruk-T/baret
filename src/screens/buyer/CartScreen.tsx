import { Alert, FlatList, Image, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useCart } from '../../context/CartContext';
import type { BuyerTabParamList } from '../../types/navigation.types';

type CartNav = BottomTabNavigationProp<BuyerTabParamList, 'Cart'>;

export function CartScreen() {
  const navigation = useNavigation<CartNav>();
  const { items, removeItem, updateQuantity, clearCart, totalAmount, itemCount, isReady } =
    useCart();

  const confirmClear = () => {
    Alert.alert('Sepeti temizle', 'Tüm ürünler sepetten kaldırılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Temizle', style: 'destructive', onPress: clearCart },
    ]);
  };

  if (!isReady) {
    return <View className="flex-1 bg-white" />;
  }

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="mb-2 text-lg font-semibold text-gray-900">Sepetin boş</Text>
        <Text className="mb-6 text-center text-sm text-gray-500">
          Ana Sayfa’dan ürün seçip sepete ekleyebilirsin.
        </Text>
        <Pressable
          className="rounded-xl bg-brand px-5 py-3"
          onPress={() => navigation.navigate('Home')}
        >
          <Text className="font-semibold text-white">Ürünlere git</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3">
        <Text className="flex-1 pr-3 text-sm text-gray-600">
          {itemCount} adet · {items[0]?.storeName}
        </Text>
        <Pressable onPress={confirmClear}>
          <Text className="text-sm font-medium text-red-600">Sepeti temizle</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        contentContainerClassName="px-4 py-3"
        renderItem={({ item }) => {
          const lineTotal = item.price * item.quantity;
          return (
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
                <Text className="mb-1 text-sm text-brand">
                  ₺{item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ×{' '}
                  {item.quantity}
                </Text>
                <Text className="mb-2 text-xs text-gray-500">
                  Satır: ₺{lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
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
          );
        }}
      />

      <View className="border-t border-gray-100 px-4 py-4">
        <Text className="mb-1 text-lg font-semibold text-gray-900">
          Toplam: ₺{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
        </Text>
        <Text className="text-xs text-gray-500">
          Sepet cihazda saklanır. Sipariş / checkout Gün 16’da.
        </Text>
      </View>
    </View>
  );
}

import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';

import { ProductThumb } from '../../components/common/ProductThumb';
import { useCart } from '../../context/CartContext';
import type {
  BuyerCartStackParamList,
  BuyerTabParamList,
} from '../../types/navigation.types';
import { formatTRY } from '../../utils/format';

type CartNav = CompositeNavigationProp<
  NativeStackNavigationProp<BuyerCartStackParamList, 'CartList'>,
  BottomTabNavigationProp<BuyerTabParamList>
>;

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
    return <View className="flex-1 bg-stone-50" />;
  }

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 px-6">
        <Text className="mb-2 text-lg font-semibold text-stone-900">Sepetin boş</Text>
        <Text className="mb-6 text-center text-sm text-stone-500">
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
    <View className="flex-1 bg-stone-50">
      <View className="flex-row items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
        <Text className="flex-1 pr-3 text-sm text-stone-600">
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
            <View className="mb-3 flex-row rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
              <ProductThumb uri={item.imageUrl} />
              <View className="flex-1">
                <Text className="mb-1 text-base font-semibold text-stone-900" numberOfLines={2}>
                  {item.name}
                </Text>
                <Text className="mb-1 text-sm text-brand">
                  {formatTRY(item.price)} × {item.quantity}
                </Text>
                <Text className="mb-2 text-xs text-stone-500">
                  Satır: {formatTRY(lineTotal)}
                </Text>
                <View className="flex-row items-center">
                  <Pressable
                    className="h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white"
                    onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                  >
                    <Text>−</Text>
                  </Pressable>
                  <Text className="mx-3 font-semibold text-stone-900">{item.quantity}</Text>
                  <Pressable
                    className="h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white"
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

      <View className="border-t border-stone-200 bg-white px-4 py-4">
        <Text className="mb-3 text-lg font-semibold text-stone-900">
          Toplam: {formatTRY(totalAmount)}
        </Text>
        <Pressable
          className="items-center rounded-2xl bg-brand py-4"
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text className="text-base font-bold text-white">Siparişe geç</Text>
        </Pressable>
      </View>
    </View>
  );
}

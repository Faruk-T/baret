import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';

import { ProductThumb } from '../../components/common/ProductThumb';
import { EmptyState } from '../../components/ui/EmptyState';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useCart } from '../../context/CartContext';
import type {
  BuyerCartStackParamList,
  BuyerTabParamList,
} from '../../types/navigation.types';
import { formatTRY } from '../../utils/format';
import { ui } from '../../theme/ui';

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
    return <View className="flex-1 bg-[#FFF8F3]" />;
  }

  if (items.length === 0) {
    return (
      <View className="flex-1 bg-[#FFF8F3]">
        <EmptyState
          icon="cart-outline"
          title="Sepetin boş"
          description="Ana Sayfa’dan ürün seçip sepete ekle — tek mağazadan alışveriş yaparsın."
          actionLabel="Ürünlere git"
          onAction={() => navigation.navigate('Home')}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FFF8F3]">
      <View className="flex-row items-center justify-between border-b border-orange-100 bg-white px-4 py-3">
        <View className="flex-1 pr-3">
          <Text className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Sepet
          </Text>
          <Text className="mt-0.5 text-sm font-semibold text-stone-800">
            {itemCount} adet · {items[0]?.storeName}
          </Text>
        </View>
        <Pressable onPress={confirmClear}>
          <Text className="text-sm font-bold text-red-600">Temizle</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        contentContainerClassName="px-4 py-3"
        renderItem={({ item }) => {
          const lineTotal = item.price * item.quantity;
          return (
            <View
              className="mb-3 overflow-hidden rounded-2xl border border-stone-200 bg-white"
              style={ui.shadow}
            >
              <View className="flex-row items-start p-3">
                <ProductThumb uri={item.imageUrl} size={72} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    className="mb-1 text-base font-bold text-stone-900"
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  <Text className="mb-0.5 text-sm text-stone-500" numberOfLines={1}>
                    {item.storeName}
                  </Text>
                  <Text className="mb-1 text-base font-bold text-brand">
                    {formatTRY(item.price)}
                  </Text>
                  <Text className="mb-3 text-xs text-stone-500">
                    {item.quantity} adet · Satır {formatTRY(lineTotal)}
                  </Text>
                  <View className="flex-row items-center">
                    <Pressable
                      className="h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-[#FFF8F3]"
                      onPress={() =>
                        updateQuantity(item.productId, item.quantity - 1)
                      }
                    >
                      <Text className="text-lg text-stone-800">−</Text>
                    </Pressable>
                    <Text className="mx-3 min-w-[24px] text-center text-base font-bold text-stone-900">
                      {item.quantity}
                    </Text>
                    <Pressable
                      className="h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-[#FFF8F3]"
                      onPress={() => {
                        try {
                          updateQuantity(item.productId, item.quantity + 1);
                        } catch (error) {
                          const message =
                            error instanceof Error
                              ? error.message
                              : 'Miktar güncellenemedi.';
                          Alert.alert('Stok', message);
                        }
                      }}
                    >
                      <Text className="text-lg text-stone-800">+</Text>
                    </Pressable>
                    <Pressable
                      className="ml-auto px-1"
                      onPress={() => removeItem(item.productId)}
                    >
                      <Text className="text-sm font-bold text-red-600">Kaldır</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />

      <View
        className="border-t border-orange-100 bg-white px-4 py-4"
        style={ui.shadow}
      >
        <View className="mb-3 flex-row items-end justify-between">
          <Text className="text-sm text-stone-500">Toplam</Text>
          <Text className="text-2xl font-bold text-stone-900">
            {formatTRY(totalAmount)}
          </Text>
        </View>
        <PrimaryButton
          label="Siparişe geç"
          onPress={() => navigation.navigate('Checkout')}
        />
      </View>
    </View>
  );
}

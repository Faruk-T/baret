import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { DeliveryOption } from '../types/database';

export type CartItem = {
  productId: string;
  storeId: string;
  storeName: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  stock: number;
  deliveryOptions: DeliveryOption[];
};

export type CartProductInput = {
  id: string;
  store_id: string;
  storeName: string;
  name: string;
  price: number;
  image_url: string | null;
  stock: number;
  delivery_options: DeliveryOption[];
};

type CartContextValue = {
  items: CartItem[];
  addItem: (product: CartProductInput, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const addItem = useCallback((product: CartProductInput, quantity = 1) => {
    const qty = Math.max(1, Math.floor(quantity));
    const prev = itemsRef.current;

    if (product.stock < 1) {
      throw new Error('Bu ürün stokta yok.');
    }

    if (prev.length > 0 && prev[0].storeId !== product.store_id) {
      throw new Error(
        'Sepette başka bir mağazanın ürünü var. Önce sepeti temizle veya aynı mağazadan devam et.'
      );
    }

    const existing = prev.find((item) => item.productId === product.id);
    const nextQty = (existing?.quantity ?? 0) + qty;

    if (nextQty > product.stock) {
      throw new Error(`Stok yetersiz. En fazla ${product.stock} adet ekleyebilirsin.`);
    }

    if (existing) {
      setItems(
        prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: nextQty, stock: product.stock }
            : item
        )
      );
      return;
    }

    setItems([
      ...prev,
      {
        productId: product.id,
        storeId: product.store_id,
        storeName: product.storeName,
        name: product.name,
        price: Number(product.price),
        quantity: qty,
        imageUrl: product.image_url,
        stock: product.stock,
        deliveryOptions: product.delivery_options,
      },
    ]);
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const qty = Math.floor(quantity);
    const prev = itemsRef.current;

    if (qty <= 0) {
      setItems(prev.filter((item) => item.productId !== productId));
      return;
    }

    const target = prev.find((item) => item.productId === productId);
    if (!target) return;

    if (qty > target.stock) {
      throw new Error(`Stok yetersiz. En fazla ${target.stock} adet seçebilirsin.`);
    }

    setItems(
      prev.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalAmount,
      itemCount,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, totalAmount, itemCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

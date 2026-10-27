import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { BulkPriceTier, DeliveryOption } from '../types/database';
import { normalizeBulkTiers, resolveEffectiveUnitPrice } from '../utils/pricing';

const CART_STORAGE_KEY = '@baret/cart_v1';

export type CartItem = {
  productId: string;
  storeId: string;
  storeName: string;
  name: string;
  basePrice: number;
  price: number;
  quantity: number;
  imageUrl: string | null;
  stock: number;
  deliveryOptions: DeliveryOption[];
  unit?: string;
  minOrderQty?: number;
  bulkPricing?: BulkPriceTier[];
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
  unit?: string | null;
  min_order_qty?: number | null;
  bulk_pricing?: BulkPriceTier[] | null;
};

export class CartStoreConflictError extends Error {
  constructor() {
    super(
      'Sepette başka bir mağazanın ürünü var. Önce sepeti temizle veya aynı mağazadan devam et.'
    );
    this.name = 'CartStoreConflictError';
  }
}

type CartContextValue = {
  items: CartItem[];
  isReady: boolean;
  addItem: (product: CartProductInput, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

function buildCartItem(product: CartProductInput, quantity: number): CartItem {
  const basePrice = Number(product.price);
  const bulkPricing = normalizeBulkTiers(product.bulk_pricing);
  const effectivePrice = resolveEffectiveUnitPrice(basePrice, quantity, bulkPricing);
  return {
    productId: product.id,
    storeId: product.store_id,
    storeName: product.storeName,
    name: product.name,
    basePrice,
    price: effectivePrice,
    quantity,
    imageUrl: product.image_url,
    stock: product.stock,
    deliveryOptions: product.delivery_options,
    unit: product.unit ?? 'adet',
    minOrderQty: Math.max(1, product.min_order_qty ?? 1),
    bulkPricing,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (raw && mounted) {
          const parsed = JSON.parse(raw) as CartItem[];
          if (Array.isArray(parsed)) {
            setItems(
              parsed.map((item) => ({
                ...item,
                basePrice: item.basePrice ?? item.price,
                price: resolveEffectiveUnitPrice(
                  item.basePrice ?? item.price,
                  item.quantity,
                  item.bulkPricing
                ),
              }))
            );
          }
        }
      } catch {
        // ignore corrupt cache
      } finally {
        if (mounted) setIsReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    void AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, isReady]);

  const addItem = useCallback((product: CartProductInput, quantity = 1) => {
    const minQty = Math.max(1, product.min_order_qty ?? 1);
    const qty = Math.max(1, Math.floor(quantity));
    const prev = itemsRef.current;

    if (product.stock < 1) {
      throw new Error('Bu ürün stokta yok.');
    }

    if (prev.length > 0 && prev[0].storeId !== product.store_id) {
      throw new CartStoreConflictError();
    }

    const existing = prev.find((item) => item.productId === product.id);
    const nextQty = existing ? existing.quantity + qty : Math.max(minQty, qty);

    if (nextQty > product.stock) {
      throw new Error(`Stok yetersiz. En fazla ${product.stock} ${product.unit ?? 'adet'} ekleyebilirsin.`);
    }

    const basePrice = Number(product.price);
    const bulkPricing = normalizeBulkTiers(product.bulk_pricing);
    const nextUnitPrice = resolveEffectiveUnitPrice(basePrice, nextQty, bulkPricing);

    if (existing) {
      setItems(
        prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: nextQty,
                basePrice,
                price: nextUnitPrice,
                stock: product.stock,
                bulkPricing,
                unit: product.unit ?? item.unit ?? 'adet',
              }
            : item
        )
      );
      return;
    }

    setItems([...prev, buildCartItem(product, nextQty)]);
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
      throw new Error(`Stok yetersiz. En fazla ${target.stock} ${target.unit ?? 'adet'} seçebilirsin.`);
    }

    const basePrice = target.basePrice ?? target.price;
    const nextPrice = resolveEffectiveUnitPrice(basePrice, qty, target.bulkPricing);

    setItems(
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: qty, price: nextPrice }
          : item
      )
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
      isReady,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalAmount,
      itemCount,
    }),
    [items, isReady, addItem, removeItem, updateQuantity, clearCart, totalAmount, itemCount]
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

import type { CartItem } from '../context/CartContext';
import type { DeliveryOption, Order, OrderStatus } from '../types/database';
import { supabase } from './supabase';

export type OrderWithProduct = Order & {
  products: {
    name: string;
    image_url: string | null;
  } | null;
  stores: {
    name: string;
    city: string;
    district: string | null;
  } | null;
  order_commissions: {
    commission_rate: number;
    commission_amount: number;
    seller_net_amount: number;
    order_amount: number;
  } | null;
};

export type CheckoutInput = {
  buyerId: string;
  items: CartItem[];
  deliveryOption: DeliveryOption;
  deliveryAddress: string | null;
  notes?: string | null;
};

/** Intersection of delivery options available on every cart line. */
export function commonDeliveryOptions(items: CartItem[]): DeliveryOption[] {
  if (items.length === 0) return [];
  return items[0].deliveryOptions.filter((option) =>
    items.every((item) => item.deliveryOptions.includes(option))
  );
}

export async function createOrdersFromCart(input: CheckoutInput): Promise<Order[]> {
  const { buyerId, items, deliveryOption, deliveryAddress, notes } = input;

  if (items.length === 0) {
    throw new Error('Sepet boş.');
  }

  const storeId = items[0].storeId;
  if (items.some((item) => item.storeId !== storeId)) {
    throw new Error('Sepette birden fazla mağaza olamaz.');
  }

  if (!items.every((item) => item.deliveryOptions.includes(deliveryOption))) {
    throw new Error('Seçilen teslimat tüm ürünlerde desteklenmiyor.');
  }

  const needsAddress = deliveryOption === 'kargo' || deliveryOption === 'aracla_teslim';
  const address = deliveryAddress?.trim() || null;
  if (needsAddress && !address) {
    throw new Error('Bu teslimat için adres gerekli.');
  }

  // Schema: one orders row per product line (no order_items table yet).
  const rows = items.map((item) => {
    const unitPrice = Number(item.price);
    const quantity = item.quantity;
    return {
      buyer_id: buyerId,
      store_id: item.storeId,
      product_id: item.productId,
      quantity,
      unit_price: unitPrice,
      total_amount: unitPrice * quantity,
      status: 'pending' as const,
      delivery_option: deliveryOption,
      delivery_address: address,
      notes: notes?.trim() || null,
    };
  });

  const { data, error } = await supabase.from('orders').insert(rows).select('*');

  if (error) throw error;
  return data ?? [];
}

export async function listBuyerOrders(buyerId: string): Promise<OrderWithProduct[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      products ( name, image_url ),
      stores ( name, city, district )
    `
    )
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as OrderWithProduct[]) ?? [];
}

export async function listStoreOrders(storeId: string): Promise<OrderWithProduct[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      products ( name, image_url ),
      stores ( name, city, district ),
      order_commissions ( commission_rate, commission_amount, seller_net_amount, order_amount )
    `
    )
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as OrderWithProduct[]) ?? [];
}

export async function cancelBuyerOrder(orderId: string, buyerId: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
    .eq('buyer_id', buyerId)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateSellerOrderStatus(
  orderId: string,
  status: Exclude<OrderStatus, 'cancelled'>
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

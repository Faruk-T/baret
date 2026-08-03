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
  order_commissions?: {
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

  // Re-validate live price/stock (server also overwrites price)
  const productIds = items.map((i) => i.productId);
  const { data: liveProducts, error: liveError } = await supabase
    .from('products')
    .select('id, price, stock, is_active, store_id')
    .in('id', productIds);
  if (liveError) throw liveError;
  const byId = new Map((liveProducts ?? []).map((p) => [p.id, p]));

  for (const item of items) {
    const live = byId.get(item.productId);
    if (!live || !live.is_active) {
      throw new Error(`“${item.name}” artık satışta değil. Sepeti güncelle.`);
    }
    if (Number(live.stock) < item.quantity) {
      throw new Error(
        `“${item.name}” için stok yetersiz (kalan: ${live.stock}).`
      );
    }
  }

  // Schema: one orders row per product line (no order_items table yet).
  // unit_price is overwritten by DB trigger from products.price
  const rows = items.map((item) => {
    const live = byId.get(item.productId)!;
    const unitPrice = Number(live.price);
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
  const created = data ?? [];

  // Best-effort: notify store owners of new orders (in-app).
  try {
    const storeIds = [...new Set(created.map((o) => o.store_id))];
    if (storeIds.length > 0) {
      const { data: stores } = await supabase
        .from('stores')
        .select('id, owner_id, name')
        .in('id', storeIds);
      const { notifyUserSafe } = await import('./adminOps');
      for (const store of stores ?? []) {
        const count = created.filter((o) => o.store_id === store.id).length;
        await notifyUserSafe({
          userId: store.owner_id,
          title: 'Yeni sipariş',
          body: `${store.name}: ${count} yeni satır bekliyor.`,
          kind: 'order',
          createdBy: buyerId,
        });
      }
    }
  } catch {
    // ignore
  }

  return created;
}

export async function listBuyerOrders(buyerId: string): Promise<OrderWithProduct[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      products ( name, image_url ),
      stores ( name, city, district ),
      order_pickup_secrets ( code )
    `
    )
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });

  if (error) {
    // Fallback if secrets table not migrated yet
    const legacy = await supabase
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
    if (legacy.error) throw legacy.error;
    return (legacy.data as OrderWithProduct[]) ?? [];
  }

  type Row = OrderWithProduct & {
    order_pickup_secrets?: { code: string } | null;
  };
  const mapped = ((data as unknown as Row[]) ?? []).map((row) => {
    const { order_pickup_secrets, ...rest } = row;
    return {
      ...rest,
      pickup_code: order_pickup_secrets?.code ?? rest.pickup_code ?? null,
    };
  });

  // Fallback RPC if join empty on shipped orders
  await Promise.all(
    mapped.map(async (row, idx) => {
      if (row.status === 'shipped' && !row.pickup_code) {
        const { data: code } = await supabase.rpc('get_order_pickup_code', {
          p_order_id: row.id,
        });
        if (code) mapped[idx] = { ...row, pickup_code: code as string };
      }
    })
  );

  return mapped;
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
  // Hide pickup codes from seller client — only buyer should display the code.
  return ((data as OrderWithProduct[]) ?? []).map((row) => ({
    ...row,
    pickup_code: null,
  }));
}

export async function countPendingStoreOrders(storeId: string): Promise<number> {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('status', 'pending');

  if (error) throw error;
  return count ?? 0;
}

/** pending + preparing + shipped — seller still needs fulfillment access */
export async function countOpenStoreOrders(storeId: string): Promise<number> {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .in('status', ['pending', 'preparing', 'shipped']);

  if (error) throw error;
  return count ?? 0;
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

/** Seller reject: pending or preparing → cancelled (stock restored by trigger). */
export async function cancelSellerOrder(orderId: string): Promise<Order> {
  const { data: current, error: readError } = await supabase
    .from('orders')
    .select('id, status, buyer_id')
    .eq('id', orderId)
    .single();
  if (readError) throw readError;
  if (!current || !['pending', 'preparing'].includes(current.status)) {
    throw new Error('Bu sipariş artık reddedilemez.');
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
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

/** Seller: buyer shows pickup code → mark delivered. */
export async function confirmOrderPickup(code: string): Promise<Order> {
  const { data, error } = await supabase.rpc('confirm_order_pickup', {
    p_code: code.trim().toUpperCase(),
  });

  if (error) throw error;
  if (!data) throw new Error('Teslim doğrulanamadı.');
  return data as Order;
}

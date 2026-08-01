import { supabase } from './supabase';
import type { Store, User } from '../types/database';

export type AdminBuyerRow = User & {
  orderCount: number;
  deliveredCount: number;
  spendTotal: number;
};

export type AdminSellerRow = {
  user: User;
  store: Store | null;
  productCount: number;
  stockTotal: number;
  orderCount: number;
  ratingAverage: number;
  ratingCount: number;
  unsettledCommission: number;
};

export async function listBuyersAdmin(): Promise<AdminBuyerRow[]> {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'buyer')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('buyer_id, status, total_amount');

  if (ordersError) throw ordersError;

  const stats = new Map<
    string,
    { orderCount: number; deliveredCount: number; spendTotal: number }
  >();

  for (const order of orders ?? []) {
    const current = stats.get(order.buyer_id) ?? {
      orderCount: 0,
      deliveredCount: 0,
      spendTotal: 0,
    };
    current.orderCount += 1;
    if (order.status === 'delivered') {
      current.deliveredCount += 1;
      current.spendTotal += Number(order.total_amount);
    }
    stats.set(order.buyer_id, current);
  }

  return (users ?? []).map((user) => {
    const s = stats.get(user.id);
    return {
      ...user,
      orderCount: s?.orderCount ?? 0,
      deliveredCount: s?.deliveredCount ?? 0,
      spendTotal: s?.spendTotal ?? 0,
    };
  });
}

export async function listSellersAdmin(): Promise<AdminSellerRow[]> {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'seller')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('*');

  if (storesError) throw storesError;

  const storeByOwner = new Map((stores ?? []).map((s) => [s.owner_id, s]));
  const storeIds = (stores ?? []).map((s) => s.id);

  const [productsRes, ordersRes, reviewsRes, commissionsRes] = await Promise.all([
    storeIds.length
      ? supabase
          .from('products')
          .select('store_id, stock, is_active')
          .in('store_id', storeIds)
      : Promise.resolve({ data: [], error: null }),
    storeIds.length
      ? supabase.from('orders').select('store_id').in('store_id', storeIds)
      : Promise.resolve({ data: [], error: null }),
    storeIds.length
      ? supabase.from('reviews').select('store_id, rating').in('store_id', storeIds)
      : Promise.resolve({ data: [], error: null }),
    storeIds.length
      ? supabase
          .from('order_commissions')
          .select('store_id, commission_amount, collection_id')
          .in('store_id', storeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (productsRes.error) throw productsRes.error;
  if (ordersRes.error) throw ordersRes.error;
  if (reviewsRes.error) throw reviewsRes.error;
  // collection_id may be missing before SQL migration — treat as all unsettled
  const commissions = commissionsRes.error ? [] : commissionsRes.data ?? [];

  const productStats = new Map<string, { count: number; stock: number }>();
  for (const p of productsRes.data ?? []) {
    const cur = productStats.get(p.store_id) ?? { count: 0, stock: 0 };
    if (p.is_active) {
      cur.count += 1;
      cur.stock += Number(p.stock);
    }
    productStats.set(p.store_id, cur);
  }

  const orderStats = new Map<string, number>();
  for (const o of ordersRes.data ?? []) {
    orderStats.set(o.store_id, (orderStats.get(o.store_id) ?? 0) + 1);
  }

  const ratingStats = new Map<string, { sum: number; count: number }>();
  for (const r of reviewsRes.data ?? []) {
    const cur = ratingStats.get(r.store_id) ?? { sum: 0, count: 0 };
    cur.sum += Number(r.rating);
    cur.count += 1;
    ratingStats.set(r.store_id, cur);
  }

  const commissionStats = new Map<string, number>();
  for (const c of commissions) {
    const unsettled =
      !('collection_id' in c) || c.collection_id == null
        ? Number(c.commission_amount)
        : 0;
    if (unsettled > 0) {
      commissionStats.set(
        c.store_id,
        (commissionStats.get(c.store_id) ?? 0) + unsettled
      );
    }
  }

  return (users ?? []).map((user) => {
    const store = storeByOwner.get(user.id) ?? null;
    const p = store ? productStats.get(store.id) : undefined;
    const rating = store ? ratingStats.get(store.id) : undefined;
    return {
      user,
      store,
      productCount: p?.count ?? 0,
      stockTotal: p?.stock ?? 0,
      orderCount: store ? orderStats.get(store.id) ?? 0 : 0,
      ratingAverage:
        rating && rating.count > 0
          ? Math.round((rating.sum / rating.count) * 10) / 10
          : 0,
      ratingCount: rating?.count ?? 0,
      unsettledCommission: store ? commissionStats.get(store.id) ?? 0 : 0,
    };
  });
}

export async function setBuyerActive(
  userId: string,
  _active: boolean
): Promise<void> {
  // Soft flag via phone note not available — keep for future users.is_active.
  // For now admin can only view buyers; deactivation needs auth admin API.
  void userId;
  void _active;
  throw new Error(
    'Alıcı hesabını kapatmak için Supabase Auth / destek gerekir (şimdilik görüntüleme).'
  );
}

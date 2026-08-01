import { supabase } from './supabase';
import type {
  AdminAuditLog,
  AppNotification,
  OrderStatus,
  Product,
  Store,
} from '../types/database';

export async function writeAuditLog(input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from('admin_audit_logs').insert({
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    meta: input.meta ?? {},
  });
  if (error && !error.message.includes('admin_audit_logs')) {
    // Non-fatal if SQL not applied yet
    console.warn('audit log skipped', error.message);
  }
}

export async function listAuditLogs(limit = 80): Promise<AdminAuditLog[]> {
  const { data, error } = await supabase
    .from('admin_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as AdminAuditLog[]) ?? [];
}

export type MonthFinance = {
  monthKey: string;
  label: string;
  orderCount: number;
  cancelledCount: number;
  cancelRate: number;
  grossAmount: number;
  commissionAmount: number;
  unsettledAmount: number;
  collectedAmount: number;
  topStores: Array<{ storeId: string; name: string; commission: number }>;
};

export async function getMonthlyFinance(months = 6): Promise<MonthFinance[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [ordersRes, commissionsRes, storesRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status, total_amount, created_at, store_id')
      .gte('created_at', since.toISOString()),
    supabase
      .from('order_commissions')
      .select('store_id, commission_amount, collection_id, created_at')
      .gte('created_at', since.toISOString()),
    supabase.from('stores').select('id, name'),
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (commissionsRes.error) throw commissionsRes.error;

  const storeName = new Map(
    (storesRes.data ?? []).map((s) => [s.id, s.name as string])
  );

  const buckets = new Map<string, MonthFinance>();

  const ensure = (iso: string) => {
    const d = new Date(iso);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        monthKey: key,
        label: d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
        orderCount: 0,
        cancelledCount: 0,
        cancelRate: 0,
        grossAmount: 0,
        commissionAmount: 0,
        unsettledAmount: 0,
        collectedAmount: 0,
        topStores: [],
      });
    }
    return buckets.get(key)!;
  };

  for (const o of ordersRes.data ?? []) {
    const b = ensure(o.created_at);
    b.orderCount += 1;
    if (o.status === 'cancelled') b.cancelledCount += 1;
    else b.grossAmount += Number(o.total_amount);
  }

  const storeMonth = new Map<string, number>();

  for (const c of commissionsRes.data ?? []) {
    const b = ensure(c.created_at);
    const amount = Number(c.commission_amount);
    b.commissionAmount += amount;
    if (c.collection_id == null) b.unsettledAmount += amount;
    else b.collectedAmount += amount;
    const sk = `${b.monthKey}:${c.store_id}`;
    storeMonth.set(sk, (storeMonth.get(sk) ?? 0) + amount);
  }

  for (const b of buckets.values()) {
    b.cancelRate =
      b.orderCount > 0
        ? Math.round((b.cancelledCount / b.orderCount) * 1000) / 10
        : 0;
    const tops: MonthFinance['topStores'] = [];
    for (const [sk, commission] of storeMonth) {
      if (!sk.startsWith(`${b.monthKey}:`)) continue;
      const storeId = sk.slice(b.monthKey.length + 1);
      tops.push({
        storeId,
        name: storeName.get(storeId) ?? 'Mağaza',
        commission,
      });
    }
    b.topStores = tops.sort((a, c) => c.commission - a.commission).slice(0, 5);
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.monthKey < b.monthKey ? 1 : -1
  );
}

export type StoreHealth = {
  store: Store;
  score: number;
  productCount: number;
  lowStockCount: number;
  pendingOldOrders: number;
  ratingAverage: number;
  ratingCount: number;
  openReports: number;
  flags: string[];
};

export async function listStoreHealth(): Promise<StoreHealth[]> {
  const { data: stores, error } = await supabase.from('stores').select('*');
  if (error) throw error;

  const storeIds = (stores ?? []).map((s) => s.id);
  if (storeIds.length === 0) return [];

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [products, orders, reviews, reports] = await Promise.all([
    supabase
      .from('products')
      .select('store_id, stock, is_active')
      .in('store_id', storeIds),
    supabase
      .from('orders')
      .select('store_id, status, created_at')
      .in('store_id', storeIds)
      .in('status', ['pending', 'preparing']),
    supabase.from('reviews').select('store_id, rating').in('store_id', storeIds),
    supabase
      .from('platform_reports')
      .select('store_id, status')
      .in('store_id', storeIds)
      .eq('status', 'open'),
  ]);

  return (stores ?? []).map((store) => {
    const ps = (products.data ?? []).filter((p) => p.store_id === store.id);
    const active = ps.filter((p) => p.is_active);
    const lowStockCount = active.filter((p) => Number(p.stock) <= 10).length;
    const pendingOldOrders = (orders.data ?? []).filter(
      (o) => o.store_id === store.id && o.created_at < weekAgo
    ).length;
    const rs = (reviews.data ?? []).filter((r) => r.store_id === store.id);
    const ratingCount = rs.length;
    const ratingAverage =
      ratingCount > 0
        ? Math.round(
            (rs.reduce((s, r) => s + Number(r.rating), 0) / ratingCount) * 10
          ) / 10
        : 0;
    const openReports = (reports.data ?? []).filter(
      (r) => r.store_id === store.id
    ).length;

    const flags: string[] = [];
    let score = 100;
    if (!store.is_approved) {
      score -= 25;
      flags.push('Onaysız');
    }
    if (!store.is_active) {
      score -= 30;
      flags.push('Pasif');
    }
    if (lowStockCount > 0) {
      score -= Math.min(20, lowStockCount * 5);
      flags.push(`${lowStockCount} düşük stok`);
    }
    if (pendingOldOrders > 0) {
      score -= Math.min(25, pendingOldOrders * 8);
      flags.push(`${pendingOldOrders} geciken sipariş`);
    }
    if (ratingCount >= 3 && ratingAverage < 3.5) {
      score -= 15;
      flags.push('Düşük puan');
    }
    if (openReports > 0) {
      score -= Math.min(20, openReports * 10);
      flags.push(`${openReports} açık şikayet`);
    }

    return {
      store,
      score: Math.max(0, score),
      productCount: active.length,
      lowStockCount,
      pendingOldOrders,
      ratingAverage,
      ratingCount,
      openReports,
      flags,
    };
  }).sort((a, b) => a.score - b.score);
}

export async function listProductsAdmin(): Promise<
  Array<Product & { stores: { name: string } | null }>
> {
  const { data, error } = await supabase
    .from('products')
    .select('*, stores ( name )')
    .order('created_at', { ascending: false })
    .limit(150);
  if (error) throw error;
  return (data as Array<Product & { stores: { name: string } | null }>) ?? [];
}

export async function setProductActiveAdmin(
  productId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', productId);
  if (error) throw error;
}

export async function updateOrderStatusAdmin(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);
  if (error) throw error;
}

export async function createNotification(input: {
  userId: string;
  title: string;
  body: string;
  kind?: string;
  createdBy: string;
}): Promise<AppNotification | null> {
  // Prefer SECURITY DEFINER RPC (allowlisted). Fallback: admin direct insert.
  const { data, error } = await supabase.rpc('notify_user', {
    p_user_id: input.userId,
    p_title: input.title.trim(),
    p_body: input.body.trim(),
    p_kind: input.kind ?? 'info',
  });
  if (!error && data) return data as AppNotification;

  const { data: inserted, error: insertError } = await supabase
    .from('app_notifications')
    .insert({
      user_id: input.userId,
      title: input.title.trim(),
      body: input.body.trim(),
      kind: input.kind ?? 'info',
      created_by: input.createdBy,
    })
    .select('*')
    .single();
  if (insertError) {
    console.warn(
      'notification skipped',
      error?.message ?? insertError.message
    );
    return null;
  }
  return inserted as AppNotification;
}

const ORDER_STATUS_NOTIFY: Record<string, string> = {
  preparing: 'Siparişin hazırlanıyor',
  shipped: 'Siparişin yola çıktı / teslime hazır',
  delivered: 'Sipariş teslim edildi',
  cancelled: 'Sipariş iptal edildi',
};

/** Best-effort in-app notify; ignores failures. */
export async function notifyUserSafe(input: {
  userId: string;
  title: string;
  body: string;
  kind?: string;
  createdBy: string;
}): Promise<void> {
  await createNotification(input).catch(() => undefined);
}

export async function notifyBuyerOrderStatus(
  order: { buyer_id: string; id: string; status: string },
  actorId: string
): Promise<void> {
  const title = ORDER_STATUS_NOTIFY[order.status];
  if (!title) return;
  await notifyUserSafe({
    userId: order.buyer_id,
    title,
    body: `Sipariş durumu güncellendi (#${order.id.slice(0, 8)}).`,
    kind: 'order',
    createdBy: actorId,
  });
}

export async function listMyNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('app_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data as AppNotification[]) ?? [];
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('app_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('app_notifications').update({ is_read: true }).eq('id', id);
}

export type TodayPulse = {
  ordersToday: number;
  revenueToday: number;
  openReports: number;
  pendingStores: number;
  unsettledCommission: number;
};

export async function getTodayPulse(): Promise<TodayPulse> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [orders, reports, pending, commissions] = await Promise.all([
    supabase
      .from('orders')
      .select('total_amount, status, created_at')
      .gte('created_at', start.toISOString()),
    supabase
      .from('platform_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('is_approved', false)
      .eq('is_active', true),
    supabase
      .from('order_commissions')
      .select('commission_amount, collection_id'),
  ]);

  const todayOrders = orders.data ?? [];
  return {
    ordersToday: todayOrders.length,
    revenueToday: todayOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + Number(o.total_amount), 0),
    openReports: reports.count ?? 0,
    pendingStores: pending.count ?? 0,
    unsettledCommission: (commissions.data ?? [])
      .filter((c) => c.collection_id == null)
      .reduce((s, c) => s + Number(c.commission_amount), 0),
  };
}

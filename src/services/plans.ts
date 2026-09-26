import { supabase } from './supabase';
import { writeAuditLog } from './adminOps';
import type { SellerPlan, StoreSubscription } from '../types/database';

export type StoreSubscriptionWithPlan = StoreSubscription & {
  seller_plans: SellerPlan | null;
};

export type EffectivePlan = {
  subscription: StoreSubscriptionWithPlan | null;
  plan: SellerPlan | null;
  maxProducts: number;
  priceMonthly: number;
  isActive: boolean;
  endsAt: string | null;
  productCount: number;
  remainingSlots: number;
};

export async function listSellerPlans(includeInactive = false): Promise<SellerPlan[]> {
  let q = supabase.from('seller_plans').select('*').order('sort_order', { ascending: true });
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data as SellerPlan[]) ?? [];
}

export async function updateSellerPlan(
  planId: string,
  patch: Partial<
    Pick<
      SellerPlan,
      'name' | 'description' | 'max_products' | 'price_monthly' | 'is_active' | 'sort_order'
    >
  >
): Promise<SellerPlan> {
  const { data, error } = await supabase
    .from('seller_plans')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', planId)
    .select('*')
    .single();
  if (error) throw error;
  return data as SellerPlan;
}

export async function getActiveStoreSubscription(
  storeId: string
): Promise<StoreSubscriptionWithPlan | null> {
  const { data, error } = await supabase
    .from('store_subscriptions')
    .select('*, seller_plans (*)')
    .eq('store_id', storeId)
    .eq('status', 'active')
    .gt('ends_at', new Date().toISOString())
    .order('ends_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as StoreSubscriptionWithPlan | null;
}

export async function getStorePlanUsage(storeId: string): Promise<EffectivePlan> {
  const [sub, countRes] = await Promise.all([
    getActiveStoreSubscription(storeId),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId),
  ]);

  const productCount = countRes.count ?? 0;
  const plan = sub?.seller_plans ?? null;
  const maxProducts = sub
    ? Number(sub.custom_max_products ?? plan?.max_products ?? 0)
    : 0;
  const priceMonthly = sub
    ? Number(sub.custom_price_monthly ?? plan?.price_monthly ?? 0)
    : 0;

  return {
    subscription: sub,
    plan,
    maxProducts,
    priceMonthly,
    isActive: Boolean(sub),
    endsAt: sub?.ends_at ?? null,
    productCount,
    remainingSlots: Math.max(0, maxProducts - productCount),
  };
}

export async function assignStoreSubscription(input: {
  storeId: string;
  planId: string;
  months: number;
  customMaxProducts?: number | null;
  customPriceMonthly?: number | null;
  note?: string | null;
  adminId: string;
}): Promise<StoreSubscription> {
  if (input.months < 1) throw new Error('Süre en az 1 ay olmalı.');

  const ends = new Date();
  ends.setMonth(ends.getMonth() + input.months);
  ends.setHours(23, 59, 59, 999);

  // Expire previous active
  await supabase
    .from('store_subscriptions')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('store_id', input.storeId)
    .eq('status', 'active');

  const { data, error } = await supabase
    .from('store_subscriptions')
    .insert({
      store_id: input.storeId,
      plan_id: input.planId,
      status: 'active',
      custom_max_products: input.customMaxProducts ?? null,
      custom_price_monthly: input.customPriceMonthly ?? null,
      starts_at: new Date().toISOString(),
      ends_at: ends.toISOString(),
      note: input.note?.trim() || null,
      created_by: input.adminId,
    })
    .select('*')
    .single();

  if (error) throw error;

  void writeAuditLog({
    actorId: input.adminId,
    action: 'assign_plan',
    entityType: 'store_subscription',
    entityId: data.id,
    meta: {
      store_id: input.storeId,
      plan_id: input.planId,
      months: input.months,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      custom_max_products: input.customMaxProducts,
      custom_price_monthly: input.customPriceMonthly,
    },
  });

  return data as StoreSubscription;
}

export async function listStoreSubscriptionsAdmin(
  storeId: string
): Promise<StoreSubscriptionWithPlan[]> {
  const { data, error } = await supabase
    .from('store_subscriptions')
    .select('*, seller_plans (*)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data as StoreSubscriptionWithPlan[]) ?? [];
}

export type AdminSubscriptionItem = {
  id: string;
  storeId: string;
  storeName: string;
  storeCity: string;
  storeDistrict: string | null;
  storeIsApproved: boolean;
  storePhone: string;
  planCode: string;
  planName: string;
  maxProducts: number;
  productCount: number;
  priceMonthly: number;
  status: 'active' | 'past_due' | 'cancelled' | 'expired';
  startsAt: string;
  endsAt: string;
  remainingDays: number;
  isExpired: boolean;
  note: string | null;
};

export async function listAllStoreSubscriptionsAdmin(): Promise<{
  items: AdminSubscriptionItem[];
  totalActiveMrr: number;
  activeCount: number;
  expiredCount: number;
}> {
  const { data: subs, error } = await supabase
    .from('store_subscriptions')
    .select(`
      *,
      seller_plans (*),
      stores:store_id (
        id,
        name,
        city,
        district,
        phone,
        is_approved
      )
    `)
    .order('ends_at', { ascending: false });

  if (error) throw error;

  const storeIds = Array.from(new Set((subs ?? []).map((s: any) => s.store_id)));
  const productCountMap: Record<string, number> = {};

  if (storeIds.length > 0) {
    const { data: prods } = await supabase
      .from('products')
      .select('store_id');
    if (prods) {
      for (const p of prods) {
        productCountMap[p.store_id] = (productCountMap[p.store_id] || 0) + 1;
      }
    }
  }

  const now = new Date();
  let totalActiveMrr = 0;
  let activeCount = 0;
  let expiredCount = 0;

  const items: AdminSubscriptionItem[] = [];

  for (const s of (subs ?? []) as any[]) {
    const plan = s.seller_plans;
    const store = s.stores;
    if (!store) continue;

    const endsDate = new Date(s.ends_at);
    const diffMs = endsDate.getTime() - now.getTime();
    const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isExpired = remainingDays <= 0 || s.status !== 'active';

    const maxProducts = Number(s.custom_max_products ?? plan?.max_products ?? 0);
    const priceMonthly = Number(s.custom_price_monthly ?? plan?.price_monthly ?? 0);
    const productCount = productCountMap[s.store_id] ?? 0;

    if (!isExpired && s.status === 'active') {
      totalActiveMrr += priceMonthly;
      activeCount += 1;
    } else {
      expiredCount += 1;
    }

    items.push({
      id: s.id,
      storeId: s.store_id,
      storeName: store.name || 'İsimsiz Mağaza',
      storeCity: store.city || '',
      storeDistrict: store.district || null,
      storeIsApproved: Boolean(store.is_approved),
      storePhone: store.phone || '',
      planCode: plan?.code || 'basic',
      planName: plan?.name || 'Paketsiz',
      maxProducts,
      productCount,
      priceMonthly,
      status: s.status,
      startsAt: s.starts_at,
      endsAt: s.ends_at,
      remainingDays,
      isExpired,
      note: s.note,
    });
  }

  return {
    items,
    totalActiveMrr,
    activeCount,
    expiredCount,
  };
}

export async function getAdminSubscriptionsSummary(): Promise<{
  activeCount: number;
  totalMrr: number;
}> {
  const { data, error } = await supabase
    .from('store_subscriptions')
    .select('custom_price_monthly, status, ends_at, seller_plans (price_monthly)')
    .eq('status', 'active')
    .gt('ends_at', new Date().toISOString());

  if (error) return { activeCount: 0, totalMrr: 0 };

  let totalMrr = 0;
  for (const row of (data ?? []) as any[]) {
    const cost = Number(row.custom_price_monthly ?? row.seller_plans?.price_monthly ?? 0);
    totalMrr += cost;
  }

  return {
    activeCount: data?.length ?? 0,
    totalMrr,
  };
}

export async function cancelStoreSubscriptionAdmin(
  subscriptionId: string,
  adminId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('store_subscriptions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
    .select('store_id, plan_id')
    .single();

  if (error) throw error;

  void writeAuditLog({
    actorId: adminId,
    action: 'cancel_plan',
    entityType: 'store_subscription',
    entityId: subscriptionId,
    meta: {
      store_id: data.store_id,
      plan_id: data.plan_id,
    },
  });
}

/** Seller finance snapshot for dashboard (no commission). */
export async function getSellerFinanceSnapshot(storeId: string): Promise<{
  revenueDelivered: number;
  revenueOpen: number;
  orderCountDelivered: number;
  orderCountOpen: number;
  cancelledCount: number;
  planCostMonthly: number;
  estimatedNetThisMonth: number;
}> {
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [ordersRes, usage] = await Promise.all([
    supabase
      .from('orders')
      .select('status, total_amount, created_at')
      .eq('store_id', storeId)
      .gte('created_at', since.toISOString()),
    getStorePlanUsage(storeId),
  ]);

  if (ordersRes.error) throw ordersRes.error;
  const rows = ordersRes.data ?? [];

  let revenueDelivered = 0;
  let revenueOpen = 0;
  let orderCountDelivered = 0;
  let orderCountOpen = 0;
  let cancelledCount = 0;

  for (const o of rows) {
    const amount = Number(o.total_amount);
    if (o.status === 'delivered') {
      revenueDelivered += amount;
      orderCountDelivered += 1;
    } else if (o.status === 'cancelled') {
      cancelledCount += 1;
    } else {
      revenueOpen += amount;
      orderCountOpen += 1;
    }
  }

  const planCostMonthly = usage.priceMonthly;
  return {
    revenueDelivered,
    revenueOpen,
    orderCountDelivered,
    orderCountOpen,
    cancelledCount,
    planCostMonthly,
    estimatedNetThisMonth: revenueDelivered - planCostMonthly,
  };
}

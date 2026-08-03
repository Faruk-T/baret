import { supabase } from './supabase';
import type { OrderStatus } from '../types/database';

export type AdminOrderRow = {
  id: string;
  status: OrderStatus;
  quantity: number;
  total_amount: number;
  delivery_option: string;
  created_at: string;
  buyer_id: string;
  store_id: string;
  products: { name: string } | null;
  stores: { name: string; city: string } | null;
  users: { full_name: string | null; email: string } | null;
};

export async function listOrdersAdmin(filters?: {
  status?: OrderStatus | 'all';
  limit?: number;
}): Promise<AdminOrderRow[]> {
  const limit = filters?.limit ?? 100;
  const status = filters?.status;

  let query = supabase
    .from('orders')
    .select(
      `
      id,
      status,
      quantity,
      total_amount,
      delivery_option,
      created_at,
      buyer_id,
      store_id,
      products ( name ),
      stores ( name, city )
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data as unknown as AdminOrderRow[]) ?? [];
  const buyerIds = [...new Set(rows.map((r) => r.buyer_id))];

  if (buyerIds.length === 0) return rows;

  const { data: buyers } = await supabase
    .from('users')
    .select('id, full_name, email')
    .in('id', buyerIds);

  const buyerMap = new Map(
    (buyers ?? []).map((b) => [b.id, { full_name: b.full_name, email: b.email }])
  );

  return rows.map((row) => ({
    ...row,
    users: buyerMap.get(row.buyer_id) ?? null,
  }));
}

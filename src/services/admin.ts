import { supabase } from './supabase';
import type { User } from '../types/database';

export type PlatformStats = {
  users: number;
  buyers: number;
  sellers: number;
  stores: number;
  pendingStores: number;
  products: number;
  orders: number;
  reviews: number;
};

export async function getPlatformStats(): Promise<PlatformStats> {
  const [
    usersRes,
    storesRes,
    pendingRes,
    productsRes,
    ordersRes,
    reviewsRes,
  ] = await Promise.all([
    supabase.from('users').select('id, role', { count: 'exact' }),
    supabase.from('stores').select('id', { count: 'exact', head: true }),
    supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('is_approved', false)
      .eq('is_active', true),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('reviews').select('id', { count: 'exact', head: true }),
  ]);

  const err =
    usersRes.error ||
    storesRes.error ||
    pendingRes.error ||
    productsRes.error ||
    ordersRes.error ||
    reviewsRes.error;
  if (err) throw err;

  const users = usersRes.data ?? [];
  return {
    users: usersRes.count ?? users.length,
    buyers: users.filter((u) => u.role === 'buyer').length,
    sellers: users.filter((u) => u.role === 'seller').length,
    stores: storesRes.count ?? 0,
    pendingStores: pendingRes.count ?? 0,
    products: productsRes.count ?? 0,
    orders: ordersRes.count ?? 0,
    reviews: reviewsRes.count ?? 0,
  };
}

export async function listUsersAdmin(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data ?? [];
}

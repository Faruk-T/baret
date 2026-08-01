import { supabase } from './supabase';
import type { DeliveryOption, Product, Store } from '../types/database';

export type CatalogStore = Pick<
  Store,
  | 'id'
  | 'name'
  | 'city'
  | 'district'
  | 'is_approved'
  | 'is_active'
  | 'latitude'
  | 'longitude'
  | 'license_expires_at'
>;

export type CatalogProduct = Product & {
  store: CatalogStore;
};

export type CatalogFilters = {
  search?: string;
  city?: string;
  district?: string;
  deliveryOption?: DeliveryOption | null;
  minPrice?: number | null;
  maxPrice?: number | null;
};

/**
 * Active products from approved, active stores (buyer catalog).
 */
export async function listCatalogProducts(
  filters: CatalogFilters = {}
): Promise<CatalogProduct[]> {
  let query = supabase
    .from('products')
    .select(
      `
      *,
      store:stores!inner (
        id,
        name,
        city,
        district,
        latitude,
        longitude,
        is_approved,
        is_active,
        license_expires_at
      )
    `
    )
    .eq('is_active', true)
    .eq('store.is_approved', true)
    .eq('store.is_active', true)
    .not('image_url', 'is', null)
    .gt('store.license_expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  const search = filters.search?.trim();
  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const city = filters.city?.trim();
  if (city) {
    query = query.ilike('store.city', `%${city}%`);
  }

  const district = filters.district?.trim();
  if (district) {
    query = query.ilike('store.district', `%${district}%`);
  }

  if (filters.deliveryOption) {
    query = query.contains('delivery_options', [filters.deliveryOption]);
  }

  if (filters.minPrice != null && !Number.isNaN(filters.minPrice)) {
    query = query.gte('price', filters.minPrice);
  }

  if (filters.maxPrice != null && !Number.isNaN(filters.maxPrice)) {
    query = query.lte('price', filters.maxPrice);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as CatalogProduct[];
}

/** Single catalog product with store (for detail screen). */
export async function getCatalogProduct(
  productId: string
): Promise<CatalogProduct | null> {
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      *,
      store:stores!inner (
        id,
        name,
        city,
        district,
        latitude,
        longitude,
        is_approved,
        is_active,
        license_expires_at
      )
    `
    )
    .eq('id', productId)
    .eq('is_active', true)
    .eq('store.is_approved', true)
    .eq('store.is_active', true)
    .not('image_url', 'is', null)
    .gt('store.license_expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  return data as CatalogProduct | null;
}

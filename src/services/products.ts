import { supabase } from './supabase';
import type { BulkPriceTier, DeliveryOption, Product } from '../types/database';
import { normalizeBulkTiers } from '../utils/pricing';

export type ProductFormInput = {
  name: string;
  description?: string;
  price: number;
  stock: number;
  delivery_options: DeliveryOption[];
  expiry_date?: string | null;
  is_active?: boolean;
  image_url?: string | null;
  category?: string | null;
  unit?: string | null;
  min_order_qty?: number;
  bulk_pricing?: BulkPriceTier[];
  sku?: string | null;
  brand?: string | null;
  vat_rate?: number;
};

export async function listStoreProducts(storeId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getProduct(productId: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createProduct(
  storeId: string,
  input: ProductFormInput
): Promise<Product> {
  const { getStorePlanUsage } = await import('./plans');
  const usage = await getStorePlanUsage(storeId).catch(() => null);
  if (!usage?.isActive) {
    throw new Error(
      'Aktif abonelik planı yok. Admin Basic / Pro / Özel plan atamalı.'
    );
  }
  if (usage.remainingSlots <= 0) {
    throw new Error(
      `Ürün kapasitesi dolu (${usage.maxProducts}). Planını yükselt veya admin ile konuş.`
    );
  }

  const basePayload = {
    store_id: storeId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    image_url: input.image_url ?? null,
    price: input.price,
    stock: input.stock,
    delivery_options: input.delivery_options,
    expiry_date: input.expiry_date || null,
    is_active: input.is_active ?? true,
  };

  const v2Payload = {
    ...basePayload,
    category: input.category?.trim() || null,
    unit: input.unit?.trim() || 'adet',
    min_order_qty: Math.max(1, Math.floor(input.min_order_qty ?? 1)),
    bulk_pricing: normalizeBulkTiers(input.bulk_pricing),
    sku: input.sku?.trim() || null,
    brand: input.brand?.trim() || null,
    vat_rate: input.vat_rate ?? 20,
  };

  const { data, error } = await supabase
    .from('products')
    .insert(v2Payload)
    .select('*')
    .single();

  if (error) {
    // Graceful fallback if remote DB hasn't applied V2 product columns yet
    const fallback = await supabase
      .from('products')
      .insert(basePayload)
      .select('*')
      .single();
    if (fallback.error) throw fallback.error;
    return fallback.data;
  }

  return data;
}

export async function updateProduct(
  productId: string,
  input: ProductFormInput
): Promise<Product> {
  const basePatch: Partial<Omit<Product, 'id'>> = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    price: input.price,
    stock: input.stock,
    delivery_options: input.delivery_options,
    expiry_date: input.expiry_date || null,
    is_active: input.is_active ?? true,
  };

  if (input.image_url !== undefined) {
    basePatch.image_url = input.image_url;
  }

  const v2Patch: Partial<Omit<Product, 'id'>> = {
    ...basePatch,
    ...(input.category !== undefined ? { category: input.category?.trim() || null } : {}),
    ...(input.unit !== undefined ? { unit: input.unit?.trim() || 'adet' } : {}),
    ...(input.min_order_qty !== undefined
      ? { min_order_qty: Math.max(1, Math.floor(input.min_order_qty)) }
      : {}),
    ...(input.bulk_pricing !== undefined
      ? { bulk_pricing: normalizeBulkTiers(input.bulk_pricing) }
      : {}),
    ...(input.sku !== undefined ? { sku: input.sku?.trim() || null } : {}),
    ...(input.brand !== undefined ? { brand: input.brand?.trim() || null } : {}),
    ...(input.vat_rate !== undefined ? { vat_rate: input.vat_rate } : {}),
  };

  const { data, error } = await supabase
    .from('products')
    .update(v2Patch)
    .eq('id', productId)
    .select('*')
    .single();

  if (error) {
    const fallback = await supabase
      .from('products')
      .update(basePatch)
      .eq('id', productId)
      .select('*')
      .single();
    if (fallback.error) throw fallback.error;
    return fallback.data;
  }

  return data;
}

export async function quickUpdateProductStockPrice(
  productId: string,
  patch: { price: number; stock: number }
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({
      price: patch.price,
      stock: patch.stock,
    })
    .eq('id', productId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(productId: string): Promise<void> {
  // Soft-delete: hide from catalog, keep history for orders/reviews
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', productId);
  if (error) throw error;
}

export async function reactivateProduct(productId: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ is_active: true })
    .eq('id', productId);
  if (error) throw error;
}

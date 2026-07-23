import { supabase } from './supabase';
import type { DeliveryOption, Product } from '../types/database';

export type ProductFormInput = {
  name: string;
  description?: string;
  price: number;
  stock: number;
  delivery_options: DeliveryOption[];
  expiry_date?: string | null;
  is_active?: boolean;
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
  const { data, error } = await supabase
    .from('products')
    .insert({
      store_id: storeId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price: input.price,
      stock: input.stock,
      delivery_options: input.delivery_options,
      expiry_date: input.expiry_date || null,
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(
  productId: string,
  input: ProductFormInput
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price: input.price,
      stock: input.stock,
      delivery_options: input.delivery_options,
      expiry_date: input.expiry_date || null,
      is_active: input.is_active ?? true,
    })
    .eq('id', productId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) throw error;
}

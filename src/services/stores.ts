import { supabase } from './supabase';
import type { Store } from '../types/database';

export type StoreFormInput = {
  name: string;
  description?: string;
  address: string;
  city: string;
  district?: string;
  phone: string;
  email?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export async function getMyStore(ownerId: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createStore(ownerId: string, input: StoreFormInput): Promise<Store> {
  const { data, error } = await supabase
    .from('stores')
    .insert({
      owner_id: ownerId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      address: input.address.trim(),
      city: input.city.trim(),
      district: input.district?.trim() || null,
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateStore(storeId: string, input: StoreFormInput): Promise<Store> {
  const patch: Record<string, unknown> = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    address: input.address.trim(),
    city: input.city.trim(),
    district: input.district?.trim() || null,
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
  };

  if (input.latitude !== undefined) patch.latitude = input.latitude;
  if (input.longitude !== undefined) patch.longitude = input.longitude;

  const { data, error } = await supabase
    .from('stores')
    .update(patch)
    .eq('id', storeId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/** Admin: pending stores (is_approved = false). Requires admin role + RLS. */
export async function listPendingStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('is_approved', false)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Admin: all stores (pending + approved). */
export async function listAllStoresAdmin(): Promise<Store[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function approveStore(storeId: string): Promise<Store> {
  const { data, error } = await supabase
    .from('stores')
    .update({ is_approved: true, is_active: true })
    .eq('id', storeId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function unapproveStore(storeId: string): Promise<Store> {
  const { data, error } = await supabase
    .from('stores')
    .update({ is_approved: false })
    .eq('id', storeId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function rejectStore(storeId: string): Promise<void> {
  const { error } = await supabase
    .from('stores')
    .update({ is_active: false })
    .eq('id', storeId);

  if (error) throw error;
}

export async function reactivateStore(storeId: string): Promise<void> {
  const { error } = await supabase
    .from('stores')
    .update({ is_active: true })
    .eq('id', storeId);

  if (error) throw error;
}

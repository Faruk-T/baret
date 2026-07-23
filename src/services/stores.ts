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
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateStore(storeId: string, input: StoreFormInput): Promise<Store> {
  const { data, error } = await supabase
    .from('stores')
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      address: input.address.trim(),
      city: input.city.trim(),
      district: input.district?.trim() || null,
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
    })
    .eq('id', storeId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

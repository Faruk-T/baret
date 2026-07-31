import { supabase } from './supabase';
import type { LicenseKey, Store } from '../types/database';
import { generateLicenseCode } from '../utils/license';

export type CreateLicenseInput = {
  durationDays: number;
  notes?: string;
};

export async function listLicenseKeysAdmin(): Promise<LicenseKey[]> {
  const { data, error } = await supabase
    .from('license_keys')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data ?? [];
}

export async function createLicenseKey(
  adminId: string,
  input: CreateLicenseInput
): Promise<LicenseKey> {
  if (!Number.isInteger(input.durationDays) || input.durationDays < 1) {
    throw new Error('Süre en az 1 gün olmalı.');
  }

  let lastError: Error | null = null;

  // Retry a few times if a rare code collision happens.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateLicenseCode();
    const { data, error } = await supabase
      .from('license_keys')
      .insert({
        code,
        duration_days: input.durationDays,
        notes: input.notes?.trim() || null,
        created_by: adminId,
      })
      .select('*')
      .single();

    if (!error && data) return data;
    lastError = error ?? new Error('Lisans anahtarı oluşturulamadı.');
    if (error && !String(error.message).toLowerCase().includes('duplicate')) {
      throw error;
    }
  }

  throw lastError ?? new Error('Lisans anahtarı oluşturulamadı.');
}

export async function redeemLicenseKey(code: string): Promise<Store> {
  const { data, error } = await supabase.rpc('redeem_license_key', {
    p_code: code.trim(),
  });

  if (error) throw error;
  if (!data) throw new Error('Lisans uygulanamadı.');
  return data;
}

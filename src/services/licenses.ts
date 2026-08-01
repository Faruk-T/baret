import { supabase } from './supabase';
import type { LicenseKey, Store } from '../types/database';
import { generateLicenseCode } from '../utils/license';

export type CreateLicenseInput = {
  /** Absolute end of day (local) when seller license should expire after redeem */
  expiresAt: Date;
  notes?: string;
};

function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysUntil(date: Date): number {
  const ms = endOfLocalDay(date).getTime() - Date.now();
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

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
  const expiresAt = endOfLocalDay(input.expiresAt);
  if (expiresAt.getTime() <= Date.now()) {
    throw new Error('Bitiş tarihi bugünden sonra olmalı.');
  }

  const durationDays = daysUntil(expiresAt);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateLicenseCode();
    const { data, error } = await supabase
      .from('license_keys')
      .insert({
        code,
        duration_days: durationDays,
        expires_at: expiresAt.toISOString(),
        notes: input.notes?.trim() || null,
        created_by: adminId,
      })
      .select('*')
      .single();

    if (!error && data) return data;
    lastError = error ?? new Error('Lisans anahtarı oluşturulamadı.');
    if (
      error &&
      (error.message.includes('expires_at') || error.code === 'PGRST204')
    ) {
      throw new Error(
        'Lisans bitiş tarihi kolonu yok. Supabase’te docs/admin-ops-v2-setup.sql çalıştır.'
      );
    }
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

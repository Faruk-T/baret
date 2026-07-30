import { supabase } from './supabase';
import type { PlatformReport } from '../types/database';

export type StoreContact = {
  store_id: string;
  store_name: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
};

/** Unlocks only when order status is preparing / shipped / delivered. */
export async function getOrderStoreContact(
  orderId: string
): Promise<StoreContact> {
  const { data, error } = await supabase.rpc('get_order_store_contact', {
    p_order_id: orderId,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error('İletişim bilgisi henüz açılamaz.');
  }
  return row as StoreContact;
}

export const REPORT_REASONS = [
  'Satıcı telefon / WhatsApp paylaştı',
  'Platform dışı anlaşma teklifi',
  'Sahte / yanıltıcı ürün',
  'Diğer',
] as const;

export async function createPlatformReport(input: {
  reporterId: string;
  storeId: string;
  orderId?: string | null;
  reason: string;
  details?: string | null;
}): Promise<PlatformReport> {
  const { data, error } = await supabase
    .from('platform_reports')
    .insert({
      reporter_id: input.reporterId,
      store_id: input.storeId,
      order_id: input.orderId ?? null,
      reason: input.reason.trim(),
      details: input.details?.trim() || null,
      status: 'open',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listPlatformReportsAdmin(): Promise<PlatformReport[]> {
  const { data, error } = await supabase
    .from('platform_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data ?? [];
}

export async function updatePlatformReportStatus(
  id: string,
  status: PlatformReport['status'],
  adminNote?: string | null
): Promise<PlatformReport> {
  const { data, error } = await supabase
    .from('platform_reports')
    .update({
      status,
      admin_note: adminNote?.trim() || null,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

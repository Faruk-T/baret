import { supabase } from './supabase';
import type { OrderCommission, PlatformSettings } from '../types/database';

export type CommissionSummary = {
  rate: number;
  orderCount: number;
  grossAmount: number;
  commissionAmount: number;
  sellerNetAmount: number;
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(
      'platform_settings bulunamadı. docs/commission-setup.sql çalıştırıldı mı?'
    );
  }
  return data;
}

export async function updateCommissionSettings(
  input: {
    commissionRate: number;
    introCommissionRate: number;
    introOrderLimit: number;
    highRatingDiscount: number;
  },
  adminId: string
): Promise<PlatformSettings> {
  const check = (rate: number, label: string) => {
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      throw new Error(`${label} 0–100 arasında olmalı.`);
    }
  };
  check(input.commissionRate, 'Komisyon oranı');
  check(input.introCommissionRate, 'İlk sipariş oranı');
  check(input.highRatingDiscount, 'Puan indirimi');
  if (
    !Number.isInteger(input.introOrderLimit) ||
    input.introOrderLimit < 0
  ) {
    throw new Error('İlk sipariş limiti 0 veya üzeri tam sayı olmalı.');
  }

  const { data, error } = await supabase
    .from('platform_settings')
    .update({
      commission_rate: Math.round(input.commissionRate * 100) / 100,
      intro_commission_rate: Math.round(input.introCommissionRate * 100) / 100,
      intro_order_limit: input.introOrderLimit,
      high_rating_discount: Math.round(input.highRatingDiscount * 100) / 100,
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    })
    .eq('id', 1)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/** @deprecated use updateCommissionSettings */
export async function updateCommissionRate(
  rate: number,
  adminId: string
): Promise<PlatformSettings> {
  const current = await getPlatformSettings();
  return updateCommissionSettings(
    {
      commissionRate: rate,
      introCommissionRate: Number(current.intro_commission_rate ?? 5),
      introOrderLimit: Number(current.intro_order_limit ?? 10),
      highRatingDiscount: Number(current.high_rating_discount ?? 1),
    },
    adminId
  );
}

export async function getCommissionSummary(): Promise<CommissionSummary> {
  const [settings, commissionsRes] = await Promise.all([
    getPlatformSettings(),
    supabase
      .from('order_commissions')
      .select('order_amount, commission_amount, seller_net_amount'),
  ]);

  if (commissionsRes.error) throw commissionsRes.error;

  const rows = commissionsRes.data ?? [];
  return {
    rate: Number(settings.commission_rate),
    orderCount: rows.length,
    grossAmount: rows.reduce((sum, r) => sum + Number(r.order_amount), 0),
    commissionAmount: rows.reduce(
      (sum, r) => sum + Number(r.commission_amount),
      0
    ),
    sellerNetAmount: rows.reduce(
      (sum, r) => sum + Number(r.seller_net_amount),
      0
    ),
  };
}

export type OrderCommissionSnippet = Pick<
  OrderCommission,
  'commission_rate' | 'commission_amount' | 'seller_net_amount' | 'order_amount'
>;

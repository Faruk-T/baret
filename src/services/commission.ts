import { supabase } from './supabase';
import type {
  CommissionCollection,
  OrderCommission,
  PlatformSettings,
} from '../types/database';

export type CommissionSummary = {
  rate: number;
  orderCount: number;
  grossAmount: number;
  commissionAmount: number;
  sellerNetAmount: number;
};

export type CommissionSettingsInput = {
  /** Flat percent applied to every order line (e.g. 10 = %10). */
  rate: number;
};

export type CommissionPreview = {
  amount: number;
  tierLabel: string;
  rate: number;
  commission: number;
  sellerNet: number;
  usedMinFloor: boolean;
};

/** Client-side preview: flat percent, no floor / tiers / intro. */
export function previewCommission(
  amount: number,
  ratePercent: number
): CommissionPreview {
  const safeAmount = Math.max(0, amount);
  const rate = Math.max(0, Math.min(100, ratePercent));
  const commission = Math.round(((safeAmount * rate) / 100) * 100) / 100;

  return {
    amount: safeAmount,
    tierLabel: `Sabit %${rate.toLocaleString('tr-TR')}`,
    rate,
    commission,
    sellerNet: Math.round((safeAmount - commission) * 100) / 100,
    usedMinFloor: false,
  };
}

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

  // Back-compat defaults if tiers SQL not applied yet
  return {
    ...data,
    tier1_max: Number(data.tier1_max ?? 100),
    tier1_rate: Number(data.tier1_rate ?? 10),
    tier2_max: Number(data.tier2_max ?? 1000),
    tier2_rate: Number(data.tier2_rate ?? data.commission_rate ?? 8),
    tier3_rate: Number(data.tier3_rate ?? 5),
    min_commission_amount: Number(data.min_commission_amount ?? 1),
    intro_commission_rate: Number(data.intro_commission_rate ?? 5),
    intro_order_limit: Number(data.intro_order_limit ?? 10),
    high_rating_discount: Number(data.high_rating_discount ?? 1),
  };
}

export async function updateCommissionSettings(
  input: CommissionSettingsInput,
  adminId: string
): Promise<PlatformSettings> {
  if (Number.isNaN(input.rate) || input.rate < 0 || input.rate > 100) {
    throw new Error('Komisyon oranı 0–100 arasında olmalı.');
  }

  const flat = Math.round(input.rate * 100) / 100;

  const { error } = await supabase
    .from('platform_settings')
    .update({
      commission_rate: flat,
      tier1_rate: flat,
      tier2_rate: flat,
      tier3_rate: flat,
      intro_commission_rate: flat,
      intro_order_limit: 0,
      high_rating_discount: 0,
      min_commission_amount: 0,
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    })
    .eq('id', 1);

  if (error) throw error;
  return getPlatformSettings();
}

export async function updateCommissionRate(
  rate: number,
  adminId: string
): Promise<PlatformSettings> {
  return updateCommissionSettings({ rate }, adminId);
}

export async function getCommissionSummary(): Promise<CommissionSummary> {
  const [settings, commissionsRes] = await Promise.all([
    getPlatformSettings(),
    supabase
      .from('order_commissions')
      .select('order_amount, commission_amount, seller_net_amount, collection_id'),
  ]);

  if (commissionsRes.error) throw commissionsRes.error;

  const rows = commissionsRes.data ?? [];
  return {
    rate: Number(settings.commission_rate ?? settings.tier1_rate ?? 10),
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

export type StoreCommissionRow = {
  storeId: string;
  storeName: string;
  city: string;
  orderCount: number;
  grossAmount: number;
  commissionAmount: number;
  unsettledAmount: number;
  unsettledCount: number;
  collectedAmount: number;
};

export async function listStoreCommissionSummaries(): Promise<StoreCommissionRow[]> {
  const { data, error } = await supabase
    .from('order_commissions')
    .select(
      `
      store_id,
      order_amount,
      commission_amount,
      collection_id,
      stores ( name, city )
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    if (
      error.message.includes('collection_id') ||
      error.code === 'PGRST204'
    ) {
      throw new Error(
        'Komisyon tahsilat tablosu yok. Supabase’te docs/admin-commission-collections-setup.sql çalıştır.'
      );
    }
    throw error;
  }

  type Row = {
    store_id: string;
    order_amount: number;
    commission_amount: number;
    collection_id: string | null;
    stores: { name: string; city: string } | null;
  };

  const map = new Map<string, StoreCommissionRow>();
  for (const row of (data as unknown as Row[]) ?? []) {
    const existing = map.get(row.store_id);
    const commission = Number(row.commission_amount);
    const gross = Number(row.order_amount);
    const unsettled = row.collection_id == null;
    if (!existing) {
      map.set(row.store_id, {
        storeId: row.store_id,
        storeName: row.stores?.name ?? 'Mağaza',
        city: row.stores?.city ?? '—',
        orderCount: 1,
        grossAmount: gross,
        commissionAmount: commission,
        unsettledAmount: unsettled ? commission : 0,
        unsettledCount: unsettled ? 1 : 0,
        collectedAmount: unsettled ? 0 : commission,
      });
    } else {
      existing.orderCount += 1;
      existing.grossAmount += gross;
      existing.commissionAmount += commission;
      if (unsettled) {
        existing.unsettledAmount += commission;
        existing.unsettledCount += 1;
      } else {
        existing.collectedAmount += commission;
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.unsettledAmount - a.unsettledAmount || b.commissionAmount - a.commissionAmount
  );
}

export type StoreCommissionDetail = {
  lines: Array<
    OrderCommission & {
      products?: { name: string } | null;
    }
  >;
  collections: CommissionCollection[];
};

export async function getStoreCommissionDetail(
  storeId: string
): Promise<StoreCommissionDetail> {
  const [linesRes, collectionsRes] = await Promise.all([
    supabase
      .from('order_commissions')
      .select(
        `
        *,
        orders (
          products ( name )
        )
      `
      )
      .eq('store_id', storeId)
      .order('created_at', { ascending: false }),
    supabase
      .from('commission_collections')
      .select('*')
      .eq('store_id', storeId)
      .order('collected_at', { ascending: false }),
  ]);

  if (linesRes.error) throw linesRes.error;
  if (collectionsRes.error) throw collectionsRes.error;

  type LineRow = OrderCommission & {
    orders?: { products?: { name: string } | null } | null;
  };

  const lines = ((linesRes.data as unknown as LineRow[]) ?? []).map((row) => ({
    ...row,
    products: row.orders?.products ?? null,
  }));

  return {
    lines,
    collections: (collectionsRes.data as CommissionCollection[]) ?? [],
  };
}

export async function collectStoreCommissions(
  storeId: string,
  note?: string | null
): Promise<CommissionCollection> {
  const { data, error } = await supabase.rpc('collect_store_commissions', {
    p_store_id: storeId,
    p_note: note?.trim() || null,
  });

  if (error) {
    if (
      error.message.includes('collect_store_commissions') ||
      error.message.includes('function') ||
      error.code === 'PGRST202'
    ) {
      throw new Error(
        'Tahsilat RPC yok. Supabase’te docs/admin-commission-collections-setup.sql çalıştır.'
      );
    }
    throw error;
  }
  if (!data) throw new Error('Tahsilat kaydı oluşmadı.');
  return data as CommissionCollection;
}

export type OrderCommissionSnippet = Pick<
  OrderCommission,
  'commission_rate' | 'commission_amount' | 'seller_net_amount' | 'order_amount'
>;

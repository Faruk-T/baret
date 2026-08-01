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
  tier1Max: number;
  tier1Rate: number;
  tier2Max: number;
  tier2Rate: number;
  tier3Rate: number;
  minCommissionAmount: number;
  introCommissionRate: number;
  introOrderLimit: number;
  highRatingDiscount: number;
};

export type CommissionPreview = {
  amount: number;
  tierLabel: string;
  rate: number;
  commission: number;
  sellerNet: number;
  usedMinFloor: boolean;
};

function num(value: string | number, fallback = 0): number {
  if (typeof value === 'number') return value;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

/** Client-side preview matching SQL tier + min floor (without intro/rating). */
export function previewCommission(
  amount: number,
  settings: Pick<
    PlatformSettings,
    | 'tier1_max'
    | 'tier1_rate'
    | 'tier2_max'
    | 'tier2_rate'
    | 'tier3_rate'
    | 'min_commission_amount'
  >
): CommissionPreview {
  const safeAmount = Math.max(0, amount);
  let rate: number;
  let tierLabel: string;

  if (safeAmount < Number(settings.tier1_max)) {
    rate = Number(settings.tier1_rate);
    tierLabel = `Küçük (< ₺${Number(settings.tier1_max).toLocaleString('tr-TR')})`;
  } else if (safeAmount < Number(settings.tier2_max)) {
    rate = Number(settings.tier2_rate);
    tierLabel = `Orta (< ₺${Number(settings.tier2_max).toLocaleString('tr-TR')})`;
  } else {
    rate = Number(settings.tier3_rate);
    tierLabel = `Büyük (≥ ₺${Number(settings.tier2_max).toLocaleString('tr-TR')})`;
  }

  let commission = Math.round(safeAmount * rate * 100) / 100;
  const percentCut = commission;
  const minFloor = Number(settings.min_commission_amount);
  let usedMinFloor = false;
  if (commission < minFloor && safeAmount > 0) {
    commission = Math.min(minFloor, safeAmount);
    usedMinFloor = commission > percentCut;
    if (safeAmount > 0) {
      rate = Math.round((commission / safeAmount) * 10000) / 100;
    }
  }

  return {
    amount: safeAmount,
    tierLabel,
    rate,
    commission,
    sellerNet: Math.round((safeAmount - commission) * 100) / 100,
    usedMinFloor,
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
  const checkRate = (rate: number, label: string) => {
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      throw new Error(`${label} 0–100 arasında olmalı.`);
    }
  };
  const checkMoney = (value: number, label: string) => {
    if (Number.isNaN(value) || value < 0) {
      throw new Error(`${label} 0 veya üzeri olmalı.`);
    }
  };

  checkRate(input.tier1Rate, 'Küçük dilim oranı');
  checkRate(input.tier2Rate, 'Orta dilim oranı');
  checkRate(input.tier3Rate, 'Büyük dilim oranı');
  checkRate(input.introCommissionRate, 'İlk sipariş oranı');
  checkRate(input.highRatingDiscount, 'Puan indirimi');
  checkMoney(input.tier1Max, 'Küçük dilim üst limiti');
  checkMoney(input.tier2Max, 'Orta dilim üst limiti');
  checkMoney(input.minCommissionAmount, 'Minimum komisyon');

  if (input.tier2Max <= input.tier1Max) {
    throw new Error('Orta dilim limiti, küçük dilim limitinden büyük olmalı.');
  }
  if (!Number.isInteger(input.introOrderLimit) || input.introOrderLimit < 0) {
    throw new Error('İlk sipariş limiti 0 veya üzeri tam sayı olmalı.');
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;

  const { error } = await supabase
    .from('platform_settings')
    .update({
      // Legacy mirror = orta dilim (raporlar / eski kod)
      commission_rate: round2(input.tier2Rate),
      tier1_max: round2(input.tier1Max),
      tier1_rate: round2(input.tier1Rate),
      tier2_max: round2(input.tier2Max),
      tier2_rate: round2(input.tier2Rate),
      tier3_rate: round2(input.tier3Rate),
      min_commission_amount: round2(input.minCommissionAmount),
      intro_commission_rate: round2(input.introCommissionRate),
      intro_order_limit: input.introOrderLimit,
      high_rating_discount: round2(input.highRatingDiscount),
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    })
    .eq('id', 1);

  if (error) {
    if (
      error.message.includes('tier1_max') ||
      error.message.includes('column') ||
      error.code === 'PGRST204'
    ) {
      throw new Error(
        'Komisyon dilimleri henüz kurulu değil. Supabase’te docs/commission-tiers-setup.sql çalıştır.'
      );
    }
    throw error;
  }
  return getPlatformSettings();
}

/** @deprecated use updateCommissionSettings */
export async function updateCommissionRate(
  rate: number,
  adminId: string
): Promise<PlatformSettings> {
  const current = await getPlatformSettings();
  return updateCommissionSettings(
    {
      tier1Max: Number(current.tier1_max),
      tier1Rate: Number(current.tier1_rate),
      tier2Max: Number(current.tier2_max),
      tier2Rate: rate,
      tier3Rate: Number(current.tier3_rate),
      minCommissionAmount: Number(current.min_commission_amount),
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
      .select('order_amount, commission_amount, seller_net_amount, collection_id'),
  ]);

  if (commissionsRes.error) throw commissionsRes.error;

  const rows = commissionsRes.data ?? [];
  return {
    rate: Number(settings.tier2_rate ?? settings.commission_rate),
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

export { num as parseCommissionNumber };

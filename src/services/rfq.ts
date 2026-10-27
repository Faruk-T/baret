import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { BuyerSite, RfqLineItem, RfqQuote, RfqRequest } from '../types/database';

const LOCAL_SITES_KEY = '@baret/buyer_sites_v1';
const LOCAL_RFQS_KEY = '@baret/rfq_requests_v1';
const LOCAL_QUOTES_KEY = '@baret/rfq_quotes_v1';

export type RfqQuoteWithStore = RfqQuote & {
  stores?: {
    id: string;
    name: string;
    city: string;
    district: string | null;
    phone: string;
  } | null;
};

export type RfqRequestWithQuotes = RfqRequest & {
  quotes: RfqQuoteWithStore[];
  buyer?: {
    full_name: string | null;
    company_name?: string | null;
    phone: string | null;
  } | null;
};

function makeLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// =========================================================
// BUYER SITES (ŞANTİYELERİM)
// =========================================================

export async function listBuyerSites(buyerId: string): Promise<BuyerSite[]> {
  const { data, error } = await supabase
    .from('buyer_sites')
    .select('*')
    .eq('user_id', buyerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (!error && data) {
    return data;
  }

  // Fallback to local storage if remote table not migrated yet
  try {
    const raw = await AsyncStorage.getItem(`${LOCAL_SITES_KEY}_${buyerId}`);
    return raw ? (JSON.parse(raw) as BuyerSite[]) : [];
  } catch {
    return [];
  }
}

export async function createBuyerSite(input: {
  buyerId: string;
  name: string;
  city: string;
  district?: string | null;
  address: string;
  contactName?: string | null;
  contactPhone?: string | null;
  logisticsNote?: string | null;
  isDefault?: boolean;
}): Promise<BuyerSite> {
  const payload = {
    user_id: input.buyerId,
    name: input.name.trim(),
    city: input.city.trim(),
    district: input.district?.trim() || null,
    address: input.address.trim(),
    contact_name: input.contactName?.trim() || null,
    contact_phone: input.contactPhone?.trim() || null,
    logistics_note: input.logisticsNote?.trim() || null,
    is_default: input.isDefault ?? false,
  };

  const { data, error } = await supabase
    .from('buyer_sites')
    .insert(payload)
    .select('*')
    .single();

  if (!error && data) {
    return data;
  }

  // Fallback to local storage
  const existing = await listBuyerSites(input.buyerId);
  const nowIso = new Date().toISOString();
  const created: BuyerSite = {
    id: makeLocalId(),
    ...payload,
    created_at: nowIso,
    updated_at: nowIso,
  };
  const next = input.isDefault
    ? [created, ...existing.map((s) => ({ ...s, is_default: false }))]
    : [created, ...existing];
  await AsyncStorage.setItem(`${LOCAL_SITES_KEY}_${input.buyerId}`, JSON.stringify(next));
  return created;
}

export async function deleteBuyerSite(buyerId: string, siteId: string): Promise<void> {
  const { error } = await supabase
    .from('buyer_sites')
    .delete()
    .eq('id', siteId)
    .eq('user_id', buyerId);

  if (!error) return;

  const existing = await listBuyerSites(buyerId);
  const next = existing.filter((s) => s.id !== siteId);
  await AsyncStorage.setItem(`${LOCAL_SITES_KEY}_${buyerId}`, JSON.stringify(next));
}

// =========================================================
// RFQ REQUESTS & QUOTES (TOPLU MALZEME İHALESİ)
// =========================================================

export async function listBuyerRfqs(buyerId: string): Promise<RfqRequestWithQuotes[]> {
  const { data, error } = await supabase
    .from('rfq_requests')
    .select(
      `
      *,
      rfq_quotes (
        *,
        stores:store_id ( id, name, city, district, phone )
      )
    `
    )
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });

  if (!error && data) {
    return (data as any[]).map((row) => ({
      ...row,
      quotes: (row.rfq_quotes ?? []) as RfqQuoteWithStore[],
    }));
  }

  // Fallback to local storage
  try {
    const rawRfqs = await AsyncStorage.getItem(LOCAL_RFQS_KEY);
    const rawQuotes = await AsyncStorage.getItem(LOCAL_QUOTES_KEY);
    const allRfqs: RfqRequest[] = rawRfqs ? JSON.parse(rawRfqs) : [];
    const allQuotes: RfqQuoteWithStore[] = rawQuotes ? JSON.parse(rawQuotes) : [];
    return allRfqs
      .filter((r) => r.buyer_id === buyerId)
      .map((r) => ({
        ...r,
        quotes: allQuotes.filter((q) => q.rfq_id === r.id),
      }));
  } catch {
    return [];
  }
}

export async function listOpenRfqsForSeller(cityFilter?: string): Promise<RfqRequestWithQuotes[]> {
  let query = supabase
    .from('rfq_requests')
    .select(
      `
      *,
      buyer:buyer_id ( full_name, phone ),
      rfq_quotes (
        *,
        stores:store_id ( id, name, city, district, phone )
      )
    `
    )
    .in('status', ['open', 'quoted'])
    .order('created_at', { ascending: false });

  if (cityFilter?.trim()) {
    query = query.ilike('city', `%${cityFilter.trim()}%`);
  }

  const { data, error } = await query;

  if (!error && data) {
    return (data as any[]).map((row) => ({
      ...row,
      quotes: (row.rfq_quotes ?? []) as RfqQuoteWithStore[],
    }));
  }

  // Fallback to local storage
  try {
    const rawRfqs = await AsyncStorage.getItem(LOCAL_RFQS_KEY);
    const rawQuotes = await AsyncStorage.getItem(LOCAL_QUOTES_KEY);
    const allRfqs: RfqRequest[] = rawRfqs ? JSON.parse(rawRfqs) : [];
    const allQuotes: RfqQuoteWithStore[] = rawQuotes ? JSON.parse(rawQuotes) : [];
    return allRfqs
      .filter(
        (r) =>
          (r.status === 'open' || r.status === 'quoted') &&
          (!cityFilter?.trim() ||
            r.city.toLowerCase().includes(cityFilter.trim().toLowerCase()))
      )
      .map((r) => ({
        ...r,
        quotes: allQuotes.filter((q) => q.rfq_id === r.id),
      }));
  } catch {
    return [];
  }
}

export async function createRfqRequest(input: {
  buyerId: string;
  title: string;
  city: string;
  district?: string | null;
  deliveryAddress?: string | null;
  items: RfqLineItem[];
  notes?: string | null;
  expiresAt?: string | null;
}): Promise<RfqRequest> {
  if (!input.title.trim()) {
    throw new Error('İhale / talep başlığı zorunludur.');
  }
  if (!input.city.trim()) {
    throw new Error('Teslimat şehri zorunludur.');
  }
  if (input.items.length === 0) {
    throw new Error('En az 1 malzeme kalemi eklemelisiniz.');
  }

  const payload = {
    buyer_id: input.buyerId,
    title: input.title.trim(),
    city: input.city.trim(),
    district: input.district?.trim() || null,
    delivery_address: input.deliveryAddress?.trim() || input.city.trim(),
    delivery_option: 'kargo' as const,
    needed_by: input.expiresAt || null,
    items: input.items,
    notes: input.notes?.trim() || null,
    status: 'open' as const,
  };

  const { data, error } = await supabase
    .from('rfq_requests')
    .insert(payload)
    .select('*')
    .single();

  if (!error && data) {
    return data;
  }

  // Fallback to local storage
  const rawRfqs = await AsyncStorage.getItem(LOCAL_RFQS_KEY);
  const allRfqs: RfqRequest[] = rawRfqs ? JSON.parse(rawRfqs) : [];
  const nowIso = new Date().toISOString();
  const created: RfqRequest = {
    id: makeLocalId(),
    ...payload,
    accepted_quote_id: null,
    created_at: nowIso,
    updated_at: nowIso,
  };
  await AsyncStorage.setItem(LOCAL_RFQS_KEY, JSON.stringify([created, ...allRfqs]));
  return created;
}

export async function submitRfqQuote(input: {
  rfqId: string;
  storeId: string;
  storeName?: string;
  storeCity?: string;
  storePhone?: string;
  totalAmount: number;
  deliveryIncluded?: boolean;
  estimatedDays: number;
  validUntil?: string | null;
  notes?: string | null;
}): Promise<RfqQuote> {
  if (input.totalAmount <= 0) {
    throw new Error('Teklif tutarı 0’dan büyük olmalıdır.');
  }

  const deliveryDays = Math.max(1, Math.floor(input.estimatedDays));
  const noteText = input.notes?.trim() || null;

  const payload = {
    rfq_id: input.rfqId,
    store_id: input.storeId,
    total_amount: input.totalAmount,
    delivery_days: deliveryDays,
    valid_until: input.validUntil || null,
    note: noteText,
    line_prices: [] as Array<{ item_index: number; unit_price: number; line_total: number }>,
    status: 'pending' as const,
  };

  const { data, error } = await supabase
    .from('rfq_quotes')
    .upsert(payload, { onConflict: 'rfq_id,store_id' })
    .select('*')
    .single();

  if (!error && data) {
    await supabase
      .from('rfq_requests')
      .update({ status: 'quoted' })
      .eq('id', input.rfqId)
      .eq('status', 'open');
    return data;
  }

  // Fallback to local storage
  const rawQuotes = await AsyncStorage.getItem(LOCAL_QUOTES_KEY);
  const allQuotes: RfqQuoteWithStore[] = rawQuotes ? JSON.parse(rawQuotes) : [];
  const filtered = allQuotes.filter(
    (q) => !(q.rfq_id === input.rfqId && q.store_id === input.storeId)
  );
  const nowIso = new Date().toISOString();
  const created: RfqQuoteWithStore = {
    id: makeLocalId(),
    ...payload,
    created_at: nowIso,
    updated_at: nowIso,
    stores: {
      id: input.storeId,
      name: input.storeName || 'Mağaza',
      city: input.storeCity || '',
      district: null,
      phone: input.storePhone || '',
    },
  };
  await AsyncStorage.setItem(LOCAL_QUOTES_KEY, JSON.stringify([created, ...filtered]));
  return created;
}

export async function acceptRfqQuote(rfqId: string, quoteId: string): Promise<void> {
  const { error } = await supabase
    .from('rfq_quotes')
    .update({ status: 'accepted' })
    .eq('id', quoteId);

  if (!error) {
    await supabase
      .from('rfq_requests')
      .update({ status: 'closed' })
      .eq('id', rfqId);
    return;
  }

  // Fallback to local storage
  const rawQuotes = await AsyncStorage.getItem(LOCAL_QUOTES_KEY);
  const allQuotes: RfqQuoteWithStore[] = rawQuotes ? JSON.parse(rawQuotes) : [];
  const nextQuotes = allQuotes.map((q) =>
    q.id === quoteId
      ? { ...q, status: 'accepted' as const }
      : q.rfq_id === rfqId
        ? { ...q, status: 'rejected' as const }
        : q
  );
  await AsyncStorage.setItem(LOCAL_QUOTES_KEY, JSON.stringify(nextQuotes));

  const rawRfqs = await AsyncStorage.getItem(LOCAL_RFQS_KEY);
  const allRfqs: RfqRequest[] = rawRfqs ? JSON.parse(rawRfqs) : [];
  const nextRfqs = allRfqs.map((r) =>
    r.id === rfqId ? { ...r, status: 'closed' as const } : r
  );
  await AsyncStorage.setItem(LOCAL_RFQS_KEY, JSON.stringify(nextRfqs));
}

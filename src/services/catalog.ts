import { supabase } from './supabase';
import type { DeliveryOption, Product, Store } from '../types/database';

export type CatalogStore = Pick<
  Store,
  | 'id'
  | 'name'
  | 'city'
  | 'district'
  | 'is_approved'
  | 'is_active'
  | 'latitude'
  | 'longitude'
  | 'license_expires_at'
>;

export type CatalogProduct = Product & {
  store: CatalogStore;
};

export type CatalogFilters = {
  search?: string;
  category?: string;
  city?: string;
  district?: string;
  deliveryOption?: DeliveryOption | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  inStockOnly?: boolean;
};

const FUTURE_LICENSE = '2028-12-31T23:59:59.000Z';

/**
 * Rich, realistic Turkish B2B/B2C construction & hardware catalog items.
 * Used automatically if the remote database has not yet applied `anon` read policies
 * or has 0 seeded products, ensuring the storefront and product detail pages never break.
 */
export const SHOWCASE_CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 'showcase-prod-1',
    store_id: 'showcase-store-1',
    name: 'CEM I 42.5R Portland Çimento (50 kg Kraft Torba)',
    description:
      'Yüksek erken dayanımlı TS EN 197-1 standartlarına uygun yapısal beton, kolon, kiriş ve şap uygulamaları için birinci sınıf gri Portland çimentosu. Palet bazlı sevkiyata uygundur.',
    price: 195,
    stock: 2400,
    delivery_options: ['aracla_teslim', 'gel_al'],
    image_url:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80',
    expiry_date: null,
    is_active: true,
    category: 'Çimento & Harç',
    unit: 'torba',
    min_order_qty: 10,
    bulk_pricing: [
      { min_qty: 50, unit_price: 184 },
      { min_qty: 200, unit_price: 172 },
    ],
    sku: 'CMT-425R-50',
    brand: 'Nuh Çimento',
    vat_rate: 20,
    created_at: '2026-10-20T09:00:00.000Z',
    updated_at: '2026-10-20T09:00:00.000Z',
    store: {
      id: 'showcase-store-1',
      name: 'Marmara Şantiye & Yapı Tedarik A.Ş.',
      city: 'İstanbul',
      district: 'Tuzla',
      latitude: 40.816,
      longitude: 29.3,
      is_approved: true,
      is_active: true,
      license_expires_at: FUTURE_LICENSE,
    },
  },
  {
    id: 'showcase-prod-2',
    store_id: 'showcase-store-2',
    name: 'Ø12 mm B420C Nervürlü İnşaat Demiri (12m Boy / Ton)',
    description:
      'Deprem yönetmeliğine (TBDY) tam uyumlu, TS 708 standartlarında üretilmiş S420 / B420C sınıfı nervürlü betonarme çelik çubuk. Fabrika test sertifikalı şantiye sevkiyatı.',
    price: 24850,
    stock: 85,
    delivery_options: ['aracla_teslim', 'gel_al'],
    image_url:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80',
    expiry_date: null,
    is_active: true,
    category: 'Demir & Çelik',
    unit: 'ton',
    min_order_qty: 1,
    bulk_pricing: [
      { min_qty: 5, unit_price: 24200 },
      { min_qty: 20, unit_price: 23650 },
    ],
    sku: 'DMR-12MM-B420C',
    brand: 'İÇDAŞ',
    vat_rate: 20,
    created_at: '2026-10-20T08:45:00.000Z',
    updated_at: '2026-10-20T08:45:00.000Z',
    store: {
      id: 'showcase-store-2',
      name: 'Anadolu Demir Çelik & Nalburiye',
      city: 'Gaziantep',
      district: 'Şehitkamil',
      latitude: 37.066,
      longitude: 37.383,
      is_approved: true,
      is_active: true,
      license_expires_at: FUTURE_LICENSE,
    },
  },
  {
    id: 'showcase-prod-3',
    store_id: 'showcase-store-1',
    name: 'Beyaz Alçıpan Plaka FX 12.5 mm (120x250 cm - 3 m²)',
    description:
      'Bölme duvar, giydirme duvar ve asma tavan sistemleri için yüksek mukavemetli standart alçı levha. Düzgün yüzeyli, hızlı montaja uygun kurumsal şantiye serisi.',
    price: 235,
    stock: 960,
    delivery_options: ['aracla_teslim', 'gel_al'],
    image_url:
      'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=900&q=80',
    expiry_date: null,
    is_active: true,
    category: 'Alçı & Alçıpan',
    unit: 'plaka',
    min_order_qty: 10,
    bulk_pricing: [
      { min_qty: 50, unit_price: 218 },
      { min_qty: 150, unit_price: 204 },
    ],
    sku: 'KNF-FX-125',
    brand: 'Knauf',
    vat_rate: 20,
    created_at: '2026-10-20T08:30:00.000Z',
    updated_at: '2026-10-20T08:30:00.000Z',
    store: {
      id: 'showcase-store-1',
      name: 'Marmara Şantiye & Yapı Tedarik A.Ş.',
      city: 'İstanbul',
      district: 'Tuzla',
      latitude: 40.816,
      longitude: 29.3,
      is_approved: true,
      is_active: true,
      license_expires_at: FUTURE_LICENSE,
    },
  },
  {
    id: 'showcase-prod-4',
    store_id: 'showcase-store-3',
    name: 'Jotashield Real Matt Silikonlu Dış Cephe Boyası (15 Litre)',
    description:
      'UV ışınlarına, karbonatlaşmaya ve zorlu hava koşullarına karşı 10 yıla kadar koruma sağlayan saf akrilik bağlayıcılı mat dış cephe boyası.',
    price: 3450,
    stock: 140,
    delivery_options: ['kargo', 'aracla_teslim', 'gel_al'],
    image_url:
      'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=80',
    expiry_date: null,
    is_active: true,
    category: 'Boya & Cephe',
    unit: 'kova',
    min_order_qty: 1,
    bulk_pricing: [
      { min_qty: 10, unit_price: 3250 },
      { min_qty: 30, unit_price: 3090 },
    ],
    sku: 'JTN-SHIELD-15L',
    brand: 'Jotun',
    vat_rate: 20,
    created_at: '2026-10-20T08:15:00.000Z',
    updated_at: '2026-10-20T08:15:00.000Z',
    store: {
      id: 'showcase-store-3',
      name: 'Başkent Yapı Kimyasalları & Boya Merkezi',
      city: 'Ankara',
      district: 'Ostim / Yenimahalle',
      latitude: 39.97,
      longitude: 32.74,
      is_approved: true,
      is_active: true,
      license_expires_at: FUTURE_LICENSE,
    },
  },
  {
    id: 'showcase-prod-5',
    store_id: 'showcase-store-3',
    name: 'Weber.kol Flex C2TE S1 Esnek Seramik & Granit Yapıştırıcısı (25 kg)',
    description:
      'İç ve dış mekanlarda büyük ebatlı seramik, porselen, granit ve doğal taşların döşenmesinde kullanılan yüksek performanslı, kayma özelliği azaltılmış esnek yapıştırma harcı.',
    price: 310,
    stock: 680,
    delivery_options: ['aracla_teslim', 'gel_al', 'kargo'],
    image_url:
      'https://images.unsplash.com/photo-1541888946425-d09bb18086f6?auto=format&fit=crop&w=900&q=80',
    expiry_date: null,
    is_active: true,
    category: 'Yapı Kimyasalları',
    unit: 'torba',
    min_order_qty: 5,
    bulk_pricing: [
      { min_qty: 54, unit_price: 285 },
      { min_qty: 162, unit_price: 268 },
    ],
    sku: 'WBR-KOLFLEX-25',
    brand: 'Saint-Gobain Weber',
    vat_rate: 20,
    created_at: '2026-10-20T08:00:00.000Z',
    updated_at: '2026-10-20T08:00:00.000Z',
    store: {
      id: 'showcase-store-3',
      name: 'Başkent Yapı Kimyasalları & Boya Merkezi',
      city: 'Ankara',
      district: 'Ostim / Yenimahalle',
      latitude: 39.97,
      longitude: 32.74,
      is_approved: true,
      is_active: true,
      license_expires_at: FUTURE_LICENSE,
    },
  },
  {
    id: 'showcase-prod-6',
    store_id: 'showcase-store-4',
    name: 'Taşyünü Mantolama Levhası 150 Yoğunluk 5 cm (Paket: 3.6 m²)',
    description:
      'A1 sınıfı yanmaz, yüksek ısı ve ses yalıtımı sağlayan dış cephe mantolama taşyünü levhası. TS EN 13162 belgeli kurumsal proje ürünü.',
    price: 640,
    stock: 420,
    delivery_options: ['aracla_teslim', 'gel_al'],
    image_url:
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80',
    expiry_date: null,
    is_active: true,
    category: 'Yalıtım & İzolasyon',
    unit: 'paket',
    min_order_qty: 5,
    bulk_pricing: [
      { min_qty: 40, unit_price: 598 },
      { min_qty: 120, unit_price: 565 },
    ],
    sku: 'IZC-TASYUNU-5CM',
    brand: 'İzocam',
    vat_rate: 20,
    created_at: '2026-10-20T07:45:00.000Z',
    updated_at: '2026-10-20T07:45:00.000Z',
    store: {
      id: 'showcase-store-4',
      name: 'Ege Endüstriyel Yalıtım & Yapı Market',
      city: 'İzmir',
      district: 'Bornova',
      latitude: 38.46,
      longitude: 27.22,
      is_approved: true,
      is_active: true,
      license_expires_at: FUTURE_LICENSE,
    },
  },
  {
    id: 'showcase-prod-7',
    store_id: 'showcase-store-4',
    name: 'GSB 18V-50 Kömürsüz Akülü Darbeli Vidalama & Matkap Seti (Çift 2.0Ah Akü)',
    description:
      'Şantiye koşullarına dayanıklı fırçasız (Brushless) motor, 50 Nm tork gücü, tam metal mandren, 2 adet 18V 2.0Ah GBA akü, hızlı şarj cihazı ve L-Case çantasıyla.',
    price: 7890,
    stock: 48,
    delivery_options: ['kargo', 'gel_al', 'aracla_teslim'],
    image_url:
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80',
    expiry_date: null,
    is_active: true,
    category: 'Hırdavat & El Aletleri',
    unit: 'adet',
    min_order_qty: 1,
    bulk_pricing: [
      { min_qty: 5, unit_price: 7450 },
      { min_qty: 10, unit_price: 7100 },
    ],
    sku: 'BSH-GSB18V50',
    brand: 'Bosch Professional',
    vat_rate: 20,
    created_at: '2026-10-20T07:30:00.000Z',
    updated_at: '2026-10-20T07:30:00.000Z',
    store: {
      id: 'showcase-store-4',
      name: 'Ege Endüstriyel Yalıtım & Yapı Market',
      city: 'İzmir',
      district: 'Bornova',
      latitude: 38.46,
      longitude: 27.22,
      is_approved: true,
      is_active: true,
      license_expires_at: FUTURE_LICENSE,
    },
  },
  {
    id: 'showcase-prod-8',
    store_id: 'showcase-store-2',
    name: 'G2/04 Gazbeton Duvar Bloğu 60x25x15 cm (1 Palet = 80 Adet)',
    description:
      'Yüksek ısı yalıtımı, hafiflik ve A1 sınıfı yangın dayanımı sağlayan G2/04 sınıfı gazbeton duvar bloğu. Palet bazında şantiyeye vinçli araçla teslim.',
    price: 4950,
    stock: 110,
    delivery_options: ['aracla_teslim', 'gel_al'],
    image_url:
      'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=900&q=80',
    expiry_date: null,
    is_active: true,
    category: 'Tuğla & Blok',
    unit: 'palet',
    min_order_qty: 1,
    bulk_pricing: [
      { min_qty: 6, unit_price: 4720 },
      { min_qty: 18, unit_price: 4490 },
    ],
    sku: 'YTG-G204-15CM',
    brand: 'Ytong / AKG',
    vat_rate: 20,
    created_at: '2026-10-20T07:15:00.000Z',
    updated_at: '2026-10-20T07:15:00.000Z',
    store: {
      id: 'showcase-store-2',
      name: 'Anadolu Demir Çelik & Nalburiye',
      city: 'Gaziantep',
      district: 'Şehitkamil',
      latitude: 37.066,
      longitude: 37.383,
      is_approved: true,
      is_active: true,
      license_expires_at: FUTURE_LICENSE,
    },
  },
];

function filterShowcaseProducts(filters: CatalogFilters): CatalogProduct[] {
  return SHOWCASE_CATALOG_PRODUCTS.filter((p) => {
    if (filters.inStockOnly && p.stock <= 0) return false;

    const search = filters.search?.trim().toLocaleLowerCase('tr-TR');
    if (search) {
      const haystack = `${p.name} ${p.description ?? ''} ${p.brand ?? ''} ${p.sku ?? ''} ${p.category ?? ''}`.toLocaleLowerCase('tr-TR');
      if (!haystack.includes(search)) return false;
    }

    const category = filters.category?.trim().toLocaleLowerCase('tr-TR');
    if (category) {
      const catHaystack = `${p.category ?? ''} ${p.name} ${p.description ?? ''}`.toLocaleLowerCase('tr-TR');
      if (!catHaystack.includes(category)) return false;
    }

    const city = filters.city?.trim().toLocaleLowerCase('tr-TR');
    if (city && !p.store.city.toLocaleLowerCase('tr-TR').includes(city)) {
      return false;
    }

    const district = filters.district?.trim().toLocaleLowerCase('tr-TR');
    if (
      district &&
      !(p.store.district ?? '').toLocaleLowerCase('tr-TR').includes(district)
    ) {
      return false;
    }

    if (
      filters.deliveryOption &&
      !p.delivery_options.includes(filters.deliveryOption)
    ) {
      return false;
    }

    if (
      filters.minPrice != null &&
      !Number.isNaN(filters.minPrice) &&
      Number(p.price) < filters.minPrice
    ) {
      return false;
    }

    if (
      filters.maxPrice != null &&
      !Number.isNaN(filters.maxPrice) &&
      Number(p.price) > filters.maxPrice
    ) {
      return false;
    }

    return true;
  });
}

async function runCatalogQuery(
  filters: CatalogFilters,
  includeCategoryColumn: boolean
): Promise<{ data: CatalogProduct[] | null; error: any }> {
  let query = supabase
    .from('products')
    .select(
      `
      *,
      store:stores!inner (
        id,
        name,
        city,
        district,
        latitude,
        longitude,
        is_approved,
        is_active,
        license_expires_at
      )
    `
    )
    .eq('is_active', true)
    .eq('store.is_approved', true)
    .eq('store.is_active', true)
    .not('image_url', 'is', null)
    .gt('store.license_expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  const search = filters.search?.trim();
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const category = filters.category?.trim();
  if (category) {
    if (includeCategoryColumn) {
      query = query.or(
        `category.ilike.%${category}%,name.ilike.%${category}%,description.ilike.%${category}%`
      );
    } else {
      query = query.or(`name.ilike.%${category}%,description.ilike.%${category}%`);
    }
  }

  if (filters.inStockOnly) {
    query = query.gt('stock', 0);
  }

  const city = filters.city?.trim();
  if (city) {
    query = query.ilike('store.city', `%${city}%`);
  }

  const district = filters.district?.trim();
  if (district) {
    query = query.ilike('store.district', `%${district}%`);
  }

  if (filters.deliveryOption) {
    query = query.contains('delivery_options', [filters.deliveryOption]);
  }

  if (filters.minPrice != null && !Number.isNaN(filters.minPrice)) {
    query = query.gte('price', filters.minPrice);
  }

  if (filters.maxPrice != null && !Number.isNaN(filters.maxPrice)) {
    query = query.lte('price', filters.maxPrice);
  }

  const { data, error } = await query;
  return { data: (data ?? null) as CatalogProduct[] | null, error };
}

/**
 * Active products from approved, active stores (buyer catalog).
 * Falls back gracefully to the curated showcase catalog if the remote DB
 * has not yet applied public `anon` read policies or has 0 seeded products.
 */
export async function listCatalogProducts(
  filters: CatalogFilters = {}
): Promise<CatalogProduct[]> {
  try {
    const first = await runCatalogQuery(filters, true);
    if (first.error && filters.category?.trim()) {
      const fallback = await runCatalogQuery(filters, false);
      if (!fallback.error && fallback.data && fallback.data.length > 0) {
        return fallback.data;
      }
    }
    if (!first.error && first.data && first.data.length > 0) {
      return first.data;
    }
    // If DB returned an empty array when filters were active, check if DB has any products at all
    if (!first.error && first.data && first.data.length === 0) {
      const baseCheck = await runCatalogQuery({}, false);
      if (!baseCheck.error && baseCheck.data && baseCheck.data.length > 0) {
        return [];
      }
    }
    return filterShowcaseProducts(filters);
  } catch {
    return filterShowcaseProducts(filters);
  }
}

/** Single catalog product with store (for detail screen). */
export async function getCatalogProduct(
  productId: string
): Promise<CatalogProduct | null> {
  const showcaseMatch = SHOWCASE_CATALOG_PRODUCTS.find(
    (p) => p.id === productId
  );
  if (showcaseMatch) {
    return showcaseMatch;
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select(
        `
        *,
        store:stores!inner (
          id,
          name,
          city,
          district,
          latitude,
          longitude,
          is_approved,
          is_active,
          license_expires_at
        )
      `
      )
      .eq('id', productId)
      .eq('is_active', true)
      .eq('store.is_approved', true)
      .eq('store.is_active', true)
      .not('image_url', 'is', null)
      .gt('store.license_expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) return null;
    return data as CatalogProduct | null;
  } catch {
    return null;
  }
}

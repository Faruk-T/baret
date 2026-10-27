/**
 * Baret B2B/B2C Ürün Kategorileri ve Ölçü Birimleri
 */
export const PRODUCT_CATEGORIES = [
  'Çimento',
  'Demir',
  'Boya',
  'Elektrik',
  'Tesisat',
  'El Aletleri',
  'İzolasyon & Yalıtım',
  'Seramik & Yapı Kimyasalları',
  'Hırdavat & Bağlantı',
  'İş Güvenliği (KKD)',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_UNITS = [
  'adet',
  'torba',
  'palet',
  'ton',
  'kg',
  'm2',
  'metre',
  'koli',
  'kova',
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export const PRODUCT_UNIT_LABELS: Record<ProductUnit, string> = {
  adet: 'Adet',
  torba: 'Torba',
  palet: 'Palet',
  ton: 'Ton',
  kg: 'Kg',
  m2: 'm²',
  metre: 'Metre',
  koli: 'Koli',
  kova: 'Kova / Teneke',
};

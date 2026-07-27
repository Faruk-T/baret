/**
 * Buyer home category chips (MVP).
 * Schema has no categories table — chips act as search shortcuts by product name.
 */
export const PRODUCT_CATEGORIES = [
  'Çimento',
  'Demir',
  'Boya',
  'Elektrik',
  'Tesisat',
  'El Aletleri',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

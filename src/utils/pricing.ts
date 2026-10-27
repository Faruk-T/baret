import type { BulkPriceTier } from '../types/database';

/**
 * Clean & sort bulk price tiers in ascending order of `min_qty`.
 */
export function normalizeBulkTiers(
  tiers?: BulkPriceTier[] | null
): BulkPriceTier[] {
  if (!Array.isArray(tiers)) return [];
  return tiers
    .filter(
      (t) =>
        t &&
        typeof t.min_qty === 'number' &&
        t.min_qty >= 2 &&
        typeof t.unit_price === 'number' &&
        t.unit_price > 0
    )
    .sort((a, b) => a.min_qty - b.min_qty);
}

/**
 * Resolve effective unit price for a given order quantity.
 * Matches the SQL `enforce_order_price_lock` V2 logic.
 */
export function resolveEffectiveUnitPrice(
  basePrice: number,
  quantity: number,
  tiers?: BulkPriceTier[] | null
): number {
  const sorted = normalizeBulkTiers(tiers);
  let effective = Number(basePrice);
  for (const tier of sorted) {
    if (quantity >= tier.min_qty && tier.unit_price > 0) {
      effective = Number(tier.unit_price);
    }
  }
  return effective;
}

export function getBulkDiscountPercent(
  basePrice: number,
  effectivePrice: number
): number {
  if (basePrice <= 0 || effectivePrice >= basePrice) return 0;
  return Math.round(((basePrice - effectivePrice) / basePrice) * 100);
}


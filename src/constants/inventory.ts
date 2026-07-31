/** Active products at or below this stock count trigger seller alerts. */
export const LOW_STOCK_THRESHOLD = 10;

export function isLowStock(stock: number, isActive = true): boolean {
  return isActive && stock >= 0 && stock <= LOW_STOCK_THRESHOLD;
}

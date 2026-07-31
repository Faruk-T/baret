/** Turkish lira formatting for UI. */
export function formatTRY(amount: number | string): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(n)) return '₺0,00';
  return `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

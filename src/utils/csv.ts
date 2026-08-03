/** Minimal CSV helper for admin exports (Share as text). */
export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.map(esc).join(';'), ...rows.map((r) => r.map(esc).join(';'))].join(
    '\n'
  );
}

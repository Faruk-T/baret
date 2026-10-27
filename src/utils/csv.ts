import { Alert, Platform, Share } from 'react-native';

/** Minimal CSV helper for admin & seller exports. */
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

/**
 * Cross-platform CSV export:
 * - Web: Triggers a direct `.csv` file download with UTF-8 BOM (Excel Turkish char compatible).
 * - iOS / Android: Opens native OS Share sheet.
 */
export async function exportCsvFile(
  filename: string,
  csvContent: string,
  title?: string
): Promise<void> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const safeName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', safeName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  try {
    await Share.share({
      title: title || filename,
      message: csvContent,
    });
  } catch (err) {
    Alert.alert(
      'Dışa Aktarma',
      err instanceof Error ? err.message : 'Paylaşılamadı.'
    );
  }
}

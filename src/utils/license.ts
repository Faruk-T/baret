export type LicenseStatus = 'missing' | 'expired' | 'expiring_soon' | 'active';

const SOON_DAYS = 7;

export function getLicenseStatus(expiresAt: string | null | undefined): LicenseStatus {
  if (!expiresAt) return 'missing';
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return 'missing';
  const now = Date.now();
  if (end <= now) return 'expired';
  const soonMs = SOON_DAYS * 24 * 60 * 60 * 1000;
  if (end - now <= soonMs) return 'expiring_soon';
  return 'active';
}

export function isLicenseValid(expiresAt: string | null | undefined): boolean {
  const status = getLicenseStatus(expiresAt);
  return status === 'active' || status === 'expiring_soon';
}

export function formatLicenseExpiry(expiresAt: string): string {
  return new Date(expiresAt).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Generate a human-readable one-time code: BARET-XXXX-XXXX */
export function generateLicenseCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chunk = (len: number) => {
    let out = '';
    for (let i = 0; i < len; i += 1) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
  };
  return `BARET-${chunk(4)}-${chunk(4)}`;
}

import Constants from 'expo-constants';

/** Live until Truncgil binds baret.truncgil.com */
export const DEFAULT_LANDING_URL = 'https://landing-ten-pi-68.vercel.app';

/** Target public hostname (Truncgil DNS). */
export const TARGET_LANDING_HOST = 'https://baret.truncgil.com';

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.baret.app';

export const TRUNCGIL_URL = 'https://www.truncgil.com';

export function getLandingUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_LANDING_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return DEFAULT_LANDING_URL;
}

export function landingPath(path: string): string {
  const base = getLandingUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export type CreditRow = {
  role: string;
  name: string;
};

export const CREDITS: CreditRow[] = [
  { role: 'Geliştirici', name: 'Faruk Tazeoğlu' },
  { role: 'Proje danışmanı', name: 'Ümit Tunç' },
  { role: 'Proje ekibi', name: 'Trunçgil Teknoloji' },
];

export type OssLicenseRow = {
  name: string;
  license: string;
  note?: string;
};

export const OSS_LICENSES: OssLicenseRow[] = [
  { name: 'Expo SDK', license: 'MIT' },
  { name: 'React Native', license: 'MIT' },
  { name: 'React', license: 'MIT' },
  { name: 'React Navigation', license: 'MIT' },
  { name: 'Supabase JS', license: 'MIT' },
  { name: 'NativeWind', license: 'MIT' },
  { name: 'GSAP (landing)', license: 'Standard / commercial terms on web' },
];

export function getAppVersionLabel(): string {
  const version =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    '1.0.0';
  const build =
    Constants.expoConfig?.android?.versionCode ??
    Constants.nativeBuildVersion ??
    null;
  if (build != null && String(build).length > 0) {
    return `v${version} (${build})`;
  }
  return `v${version}`;
}

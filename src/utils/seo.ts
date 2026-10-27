import { useEffect } from 'react';
import { Platform } from 'react-native';

export type PageSeoOptions = {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const GLOBAL_STYLE_ID = 'baret-web-enterprise-styles';
const JSON_LD_ID = 'baret-seo-jsonld';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(
    `meta[${attr}="${key}"]`
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function ensureGlobalWebStyles() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = 'tr';

  if (!document.getElementById('baret-google-fonts')) {
    const link = document.createElement('link');
    link.id = 'baret-google-fonts';
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  if (!document.getElementById(GLOBAL_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = GLOBAL_STYLE_ID;
    style.textContent = `
      html, body, #root {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        background-color: #FAFAFA;
        color: #18181B;
      }
      input, textarea {
        outline: none !important;
        min-width: 0;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      * {
        box-sizing: border-box;
      }
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #F4F4F5;
      }
      ::-webkit-scrollbar-thumb {
        background: #D4D4D8;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #A1A1AA;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Sets page title, meta description, OpenGraph tags, and Schema.org JSON-LD on Web.
 */
export function usePageSeo({
  title,
  description,
  keywords,
  canonicalPath,
  jsonLd,
}: PageSeoOptions) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    ensureGlobalWebStyles();

    const fullTitle = title.includes('Baret')
      ? title
      : `${title} | Baret Yapı & Şantiye Tedarik Platformu`;
    document.title = fullTitle;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', 'index, follow');
    upsertMeta(
      'name',
      'keywords',
      keywords ??
        'inşaat malzemeleri, şantiye tedarik, toptan çimento, inşaat demiri fiyatları, alçıpan, yapı market, nalbur, B2B yapı malzemeleri, şantiye ihale'
    );

    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:locale', 'tr_TR');
    upsertMeta('property', 'og:site_name', 'Baret Yapı & Şantiye Tedariği');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);

    if (canonicalPath && typeof window !== 'undefined') {
      let canonical = document.head.querySelector(
        'link[rel="canonical"]'
      ) as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = `${window.location.origin}${canonicalPath}`;
    }

    if (jsonLd) {
      let script = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = JSON_LD_ID;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    }
  }, [title, description, keywords, canonicalPath, jsonLd]);
}


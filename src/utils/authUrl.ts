/**
 * Parse Supabase auth callback params from a deep link.
 * Supports both hash tokens and PKCE `code` query params.
 */
export function parseAuthCallbackParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};

  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');

  const ingest = (raw: string) => {
    if (!raw) return;
    for (const part of raw.split('&')) {
      if (!part) continue;
      const eq = part.indexOf('=');
      const key = eq >= 0 ? part.slice(0, eq) : part;
      const value = eq >= 0 ? part.slice(eq + 1) : '';
      if (!key) continue;
      try {
        params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
      } catch {
        params[key] = value;
      }
    }
  };

  if (queryIndex >= 0) {
    const end = hashIndex >= 0 && hashIndex > queryIndex ? hashIndex : url.length;
    ingest(url.slice(queryIndex + 1, end));
  }
  if (hashIndex >= 0) {
    ingest(url.slice(hashIndex + 1));
  }

  return params;
}

export function isAuthCallbackUrl(url: string): boolean {
  const p = parseAuthCallbackParams(url);
  return Boolean(p.access_token || p.refresh_token || p.code || p.type === 'recovery');
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-ignore — iOS Safari standalone
    (window.navigator.standalone === true)
  );
}

export type TrustTokenParse =
  | { token: string; error: null }
  | { token: null; error: 'invalid' | 'missing' };

/**
 * Extracts the `trustToken` query parameter from a pasted or typed URL.
 * iOS Safari often copies URLs without the http:// prefix, so one is added.
 *
 * Returns a discriminated result so callers can show the same message the
 * original inline parser did: `invalid` for an unparseable URL, `missing`
 * for a valid URL without a `trustToken` parameter.
 */
export function parseTrustToken(rawValue: string): TrustTokenParse {
  let raw = rawValue.trim();
  if (!raw) return { token: null, error: 'invalid' };
  if (!/^https?:\/\//i.test(raw)) raw = `http://${raw}`;
  try {
    const token = new URL(raw).searchParams.get('trustToken');
    return token ? { token, error: null } : { token: null, error: 'missing' };
  } catch {
    return { token: null, error: 'invalid' };
  }
}

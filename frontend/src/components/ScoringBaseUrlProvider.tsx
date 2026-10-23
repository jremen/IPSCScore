import { useScoringBaseUrl } from '../hooks/useScoringBaseUrl';

/**
 * Reads the LAN URL for the scoring server and caches it so that
 * stage link QR codes contain the correct origin (phone-reachable).
 * Mount once at the top of the app (e.g. in main.tsx).
 */
export function ScoringBaseUrlProvider() {
  useScoringBaseUrl();
  return null;
}

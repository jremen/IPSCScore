import { useEffect } from 'react';
import { useLanUrl } from './useLanUrl';
import { setScoringBaseUrl } from '../services/api';

/**
 * Reads the LAN URL for the scoring server and caches it so that
 * stage link QR codes contain the correct origin (phone-reachable).
 */
export function useScoringBaseUrl() {
  const { domainUrls, loading } = useLanUrl();

  useEffect(() => {
    if (loading || !domainUrls?.scoring) return;
    // Strip /scoring path to get just the origin (e.g. "http://192.168.1.5:3001")
    setScoringBaseUrl(domainUrls.scoring.replace(/\/scoring\/?$/, ''));
  }, [domainUrls, loading]);
}

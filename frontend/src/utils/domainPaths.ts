/**
 * Public /results URL variants.
 *
 * `/results`       — standard public results page (also the QR target)
 * `/results/kiosk` — TV kiosk presentation of division results
 */
export const KIOSK_RESULTS_PATH = '/results/kiosk';

export function isKioskResultsPath(): boolean {
  if (typeof window === 'undefined') return false;
  return /^\/results\/kiosk(\/|$)/i.test(window.location.pathname);
}

import { useCallback, useState } from 'react';
import { useLanUrl } from './useLanUrl';
import { useCopyToClipboard } from './useCopyToClipboard';
import type { QRCodeModalMode } from '../components/layout/types';

export function useLanUrlBadge() {
  const { url, domainUrls } = useLanUrl();
  const [qrModalMode, setQrModalMode] = useState<QRCodeModalMode | null>(null);
  const [showTrustModal, setShowTrustModal] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  const copyIp = useCallback(() => {
    if (url) void copy(url, 'ip');
  }, [copy, url]);

  const openResultsQr = useCallback(() => setQrModalMode('results'), []);
  const openSquadsQr = useCallback(() => setQrModalMode('squads'), []);
  const openTrustModal = useCallback(() => setShowTrustModal(true), []);
  const closeQr = useCallback(() => setQrModalMode(null), []);
  const closeTrust = useCallback(() => setShowTrustModal(false), []);

  return {
    url,
    domainUrls,
    qrModalMode,
    showTrustModal,
    copied,
    copyIp,
    openResultsQr,
    openSquadsQr,
    openTrustModal,
    closeQr,
    closeTrust,
  };
}

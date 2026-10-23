import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanUrl } from './useLanUrl';
import { useQRCode } from './useQRCode';
import { useUIStore } from '../stores/uiStore';
import { generateSingleQrPdf } from '../utils/qrPdf';
import { saveBlobToDevice } from '../utils/exportUtils';
import { triggerPrint } from '../utils/print';
import { useEscClose } from './useEscClose';
import { useCopyToClipboard } from './useCopyToClipboard';
import type { QRCodeModalProps } from '../components/layout/types';

export function useQRCodeModal({ show, onClose, mode }: QRCodeModalProps) {
  const { domainUrls } = useLanUrl();
  const { t } = useTranslation();
  const { copied, copy } = useCopyToClipboard();
  const addToast = useUIStore((s) => s.addToast);

  useEscClose(show ? onClose : undefined);

  const isResults = mode === 'results';
  const isSquads = mode === 'squads';
  const url = isResults
    ? (domainUrls?.results ?? '')
    : isSquads
      ? (domainUrls?.squads ?? '')
      : (domainUrls?.scoring ?? '');
  const label = isResults
    ? t('header.qrResultsLabel')
    : isSquads
      ? t('header.qrSquadsLabel')
      : t('header.qrScoringLabel');
  const printLabel = isResults
    ? t('header.qrResultsLink')
    : isSquads
      ? t('header.qrSquadsLink')
      : t('header.qrScoringLink');
  const emoji = isResults ? '🏆' : isSquads ? '📋' : '🎯';

  const qr = useQRCode(url, { width: 512, margin: 2 });

  const handleCopy = useCallback(() => copy(url, 'qr-url'), [copy, url]);

  const handlePrint = useCallback(() => {
    triggerPrint();
  }, []);

  const handlePdf = useCallback(async () => {
    if (!qr || !url) return;
    try {
      const doc = await generateSingleQrPdf({ url, qr, label: printLabel });
      const saved = await saveBlobToDevice(doc.output('blob'), `ipsc-score-${mode}-qr-code.pdf`);
      addToast(t(saved ? 'results.pdfExported' : 'results.exportFailed'), saved ? 'success' : 'error');
    } catch (err) {
      console.error('Failed to generate QR PDF:', err);
      addToast(t('results.exportFailed'), 'error');
    }
  }, [addToast, mode, printLabel, qr, t, url]);

  return {
    t,
    url,
    label,
    printLabel,
    emoji,
    qr,
    copied: copied === 'qr-url',
    handleCopy,
    handlePrint,
    handlePdf,
  };
}

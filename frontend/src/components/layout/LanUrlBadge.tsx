import { useTranslation } from 'react-i18next';
import QRCodeModal from './QRCodeModal';
import ScorerTrustModal from './ScorerTrustModal';
import { useLanUrlBadge } from '../../hooks/useLanUrlBadge';

export default function LanUrlBadge() {
  const {
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
  } = useLanUrlBadge();
  const { t } = useTranslation();

  if (!url && !domainUrls) return null;

  return (
    <>
      <div className="hidden lg:flex items-center gap-1.5 flex-wrap">
        {url && (
          <button
            onClick={copyIp}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-gray-700 hover:bg-gray-600 text-green-400 rounded-full transition-colors cursor-pointer whitespace-nowrap"
            title={t('header.copyUrl')}
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
            </svg>
            {copied === 'ip' ? t('header.copied') : url}
          </button>
        )}
        {domainUrls && (
          <>
            <button
              onClick={openResultsQr}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-blue-700 hover:bg-blue-600 text-white rounded-full transition-colors cursor-pointer whitespace-nowrap"
              title={t('header.qrResultsHint')}
            >
              🏆 {t('header.qrResultsLink')}
            </button>
            <button
              onClick={openTrustModal}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-orange-700 hover:bg-orange-600 text-white rounded-full transition-colors cursor-pointer whitespace-nowrap"
              title={t('header.qrScoringHint')}
            >
              🎯 {t('header.qrScoringLink')}
            </button>
            <button
              onClick={openSquadsQr}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-purple-700 hover:bg-purple-600 text-white rounded-full transition-colors cursor-pointer whitespace-nowrap"
              title={t('header.qrSquadsHint')}
            >
              📋 {t('header.qrSquadsLink')}
            </button>
          </>
        )}
      </div>
      <QRCodeModal
        show={qrModalMode === 'results'}
        onClose={closeQr}
        mode="results"
      />
      <QRCodeModal
        show={qrModalMode === 'squads'}
        onClose={closeQr}
        mode="squads"
      />
      <ScorerTrustModal
        show={showTrustModal}
        onClose={closeTrust}
      />
    </>
  );
}

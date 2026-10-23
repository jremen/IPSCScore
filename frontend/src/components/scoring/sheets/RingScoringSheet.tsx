import { ringValueLabel } from '../../../utils/constants';
import { ScoringSheetHeader, DnfToggle, DqSection } from '../shared';
import { useRingScoring } from '../../../hooks/useRingScoring';
import type { ScoringSheetProps } from '../types';

export default function RingScoringSheet({ stage, score }: ScoringSheetProps) {
  const {
    t,
    shooter,
    isReadOnly,
    shotsCount,
    label,
    currentRings,
    cycleRingValue,
    longPressRing,
    handleResetAll,
    handleDnfToggle,
    preview,
    totalShots,
    typeLabel,
    typeIcon,
  } = useRingScoring(stage, score);

  return (
    <div className="p-2 sm:p-4 max-w-xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-3 shadow-sm">
        <ScoringSheetHeader
          title={`${typeIcon} ${typeLabel}`}
          subtitle={`${shotsCount} ${label.toLowerCase()}s • ${t('scoring.tapToCycle')}`}
          onReset={isReadOnly ? undefined : handleResetAll}
        />

        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
              {t('scoring.ringShotsEntered', { label, entered: totalShots, total: shotsCount })}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {currentRings.map((value, index) => (
              <button
                key={index}
                className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center font-bold transition-colors cursor-pointer
                  ${value === 0 ? 'bg-gray-50 dark:bg-gray-700/50 text-gray-400 ring-1 ring-gray-200 dark:ring-gray-600' :
                    value === 11 ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 ring-2 ring-yellow-400 eink:bg-black! eink:text-white! eink:ring-2! eink:ring-black!' :
                    value >= 9 ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-2 ring-green-400 eink:bg-black! eink:text-white! eink:ring-2! eink:ring-black!' :
                    value >= 7 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-400 eink:bg-black! eink:text-white! eink:ring-2! eink:ring-black!' :
                    'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 ring-2 ring-orange-400 eink:bg-black! eink:text-white! eink:ring-2! eink:ring-black!'}
                  ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => cycleRingValue(index)}
                onContextMenu={(event) => { event.preventDefault(); longPressRing(index); }}
                disabled={isReadOnly}
              >
                <span className="text-lg">{value === 0 ? '—' : ringValueLabel(value)}</span>
                <span className="text-2.5 text-gray-400">#{index + 1}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <DnfToggle isDnf={score.is_dnf} onToggle={handleDnfToggle} disabled={isReadOnly} />
        <DqSection shooter={shooter} disabled={isReadOnly} />
      </div>

      <div className="bg-green-50 dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800 shadow-sm">
        <h3 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2">📊 {t('scoring.scorePreview')}</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><div className="text-2xl font-bold dark:text-white">{preview.raw_points}</div><div className="text-xs text-gray-500">{t('scoring.totalScore')}</div></div>
          {preview.x_count !== undefined && preview.x_count > 0 && (
            <div><div className="text-2xl font-bold text-yellow-600">{preview.x_count}</div><div className="text-xs text-gray-500">{t('scoring.xCount')}</div></div>
          )}
          <div><div className="text-2xl font-bold text-green-600">{totalShots}/{shotsCount}</div><div className="text-xs text-gray-500">{t('scoring.shotsEntered', { label })}</div></div>
        </div>
      </div>
    </div>
  );
}

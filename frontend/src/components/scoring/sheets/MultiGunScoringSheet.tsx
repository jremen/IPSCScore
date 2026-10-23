import { Label } from 'flowbite-react';
import TimeInput from '../shared/TimeInput';
import { ScoringSheetHeader, DnfToggle, DqSection } from '../shared';
import PenaltyStepper from '../shared/PenaltyStepper';
import { useMultiGunScoring } from '../../../hooks/useMultiGunScoring';
import type { MultiGunScoringSheetProps } from '../types';

export default function MultiGunScoringSheet({ score }: MultiGunScoringSheetProps) {
  const {
    t,
    sd,
    shooter,
    isReadOnly,
    paperTargets,
    toggleNeutralized,
    handleTimeChange,
    handleResetAll,
    handleDnfToggle,
    handlePenaltyChange,
    preview,
    penalties,
  } = useMultiGunScoring(score);

  return (
    <div className="p-2 sm:p-4 max-w-2xl mx-auto">
      <div className="bg-blue-50 dark:bg-gray-800 rounded-lg p-3 mb-3 border-2 border-blue-200 dark:border-blue-800">
        <Label className="text-sm font-bold mb-1 block">⏱ {t('scoring.time')}</Label>
        <TimeInput regular value={score.time} onChange={handleTimeChange} className="text-2xl font-mono py-4!" disabled={isReadOnly} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-3 shadow-sm">
        <ScoringSheetHeader
          title={`🎯 ${t('scoring.multiGunTitle')}`}
          subtitle={`${score.targets.length} ${t('scoring.targets')}`}
          onReset={isReadOnly ? undefined : handleResetAll}
        />

        {paperTargets.length > 0 && (
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">🎯 {t('scoring.targets')}</span>
              <span className="text-xs text-gray-400">{t('scoring.tapToToggle')}</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {paperTargets.map((target, index) => {
                const neutralized = target.target_data?.neutralized ?? false;
                return (
                  <button
                    key={target.target_index}
                    className={`w-16 h-16 rounded-lg font-bold text-sm flex flex-col items-center justify-center transition-colors cursor-pointer
                      ${neutralized ? 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 ring-2 ring-green-400 eink:bg-white! eink:text-black! eink:ring-2! eink:ring-black!' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 ring-1 ring-red-300'}
                      ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => toggleNeutralized(index)}
                    disabled={isReadOnly}
                  >
                    <span className="text-lg">{neutralized ? '✓' : '✗'}</span>
                    <span className="text-2.5">T{index + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">⚠️ {t('scoring.penaltiesSecondsAdded')}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {penalties.map(({ key, label, sec }) => (
              <div key={key}>
                <Label className="text-xs">{label} <span className="text-gray-400">{t('scoring.secondsEach', { sec })}</span></Label>
                <PenaltyStepper
                  value={(sd[key] as number) || 0}
                  onDecrement={() => handlePenaltyChange(key, -1)}
                  onIncrement={() => handlePenaltyChange(key, 1)}
                  color="orange"
                  size="sm"
                  disabled={isReadOnly}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <DnfToggle isDnf={score.is_dnf} onToggle={handleDnfToggle} disabled={isReadOnly} />
        <DqSection shooter={shooter} disabled={isReadOnly} />
      </div>

      <div className="bg-green-50 dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800 shadow-sm">
        <h3 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2">📊 {t('scoring.multiGunPreview')}</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><div className="text-lg font-bold dark:text-white">{(score.time || 0).toFixed(2)}s</div><div className="text-xs text-gray-500">{t('scoring.rawTime')}</div></div>
          <div><div className="text-lg font-bold text-red-600">+{preview.penalty_points.toFixed(1)}s</div><div className="text-xs text-gray-500">{t('scoring.penalties')}</div></div>
          <div><div className="text-lg font-bold text-blue-600">{preview.total_time?.toFixed(2) ?? '0.00'}s</div><div className="text-xs text-gray-500">{t('scoring.totalTime')}</div></div>
        </div>
      </div>
    </div>
  );
}

import { Label } from 'flowbite-react';
import { ScoringSheetHeader, DnfToggle, DqSection } from '../shared';
import TimeInput from "../shared/TimeInput";
import { useActionSteelScoring } from '../../../hooks/useActionSteelScoring';
import type { ScoringSheetProps } from '../types';

export default function ActionSteelScoringSheet({ stage, score }: ScoringSheetProps) {
  const {
    t,
    shooter,
    isReadOnly,
    numStrings,
    targetsPerString,
    dropWorst,
    stringTimes,
    stringPlateHits,
    handleStringTime,
    togglePlate,
    handleResetAll,
    handleDnfToggle,
    preview,
  } = useActionSteelScoring(stage, score);

  return (
    <div className="p-2 sm:p-4 max-w-xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-3 shadow-sm">
        <ScoringSheetHeader
          title={`🎯 ${t('scoring.actionSteelTitle')}`}
          subtitle={t('scoring.actionSteelSubtitle', { strings: numStrings, plates: targetsPerString, worst: dropWorst })}
          onReset={isReadOnly ? undefined : handleResetAll}
        />

        {stringTimes.map((time, index) => {
          const hits = stringPlateHits[index] || [];
          const missCount = hits.filter((hit) => !hit).length;
          const adjustedTime = time + missCount * 3;
          return (
            <div key={index} className="p-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{t('scoring.stringN', { number: index + 1 })}</span>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">{t('scoring.timeSeconds')}</Label>
                  <TimeInput
                    regular
                    value={time}
                    onChange={(value) => handleStringTime(index, value)}
                    disabled={isReadOnly || stage.scoring_type === 'fixed_time'}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {hits.map((hit, plateIndex) => (
                  <button
                    key={plateIndex}
                    className={`w-12 h-12 rounded-lg font-bold text-sm flex items-center justify-center transition-colors cursor-pointer
                      ${hit ? 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 ring-2 ring-green-400 eink:bg-white! eink:text-black! eink:ring-2! eink:ring-black!' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 ring-1 ring-red-300'}
                      ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => togglePlate(index, plateIndex)}
                    disabled={isReadOnly}
                  >
                    P{plateIndex + 1}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>{t('scoring.hitMissSummary', { hits: hits.filter((hit) => hit).length, misses: missCount })}</span>
                <span>{t('scoring.adjustedTime', { time: adjustedTime.toFixed(2), penalty: missCount > 0 ? ` (+${missCount * 3}s)` : '' })}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <DnfToggle isDnf={score.is_dnf} onToggle={handleDnfToggle} disabled={isReadOnly} />
        <DqSection shooter={shooter} disabled={isReadOnly} />
      </div>

      <div className="bg-green-50 dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800 shadow-sm">
        <h3 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2">📊 {t('scoring.actionSteelPreview')}</h3>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{preview.total_time?.toFixed(2) ?? '0.00'}s</div>
          <div className="text-xs text-gray-500">{t('scoring.totalTimeDropWorst', { count: dropWorst })}</div>
        </div>
      </div>
    </div>
  );
}

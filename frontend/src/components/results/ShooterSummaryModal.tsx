import { Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { divisionLabel } from '../../utils/constants';
import { useConstLabels } from '../../hooks/useConstLabels';
import { visibleSummaryStages } from '../../utils/shooterSummary';
import StageSummaryCard from './StageSummaryCard';
import type { PowerFactor } from '../../types/shooter';
import type { ShooterSummaryViewProps } from './types';

export default function ShooterSummaryView({ summary, loading, onBack }: ShooterSummaryViewProps) {
  const { t } = useTranslation();
  const { categoryLabel, powerFactorLabel } = useConstLabels();
  const shooterName = summary ? `${summary.registration.first_name} ${summary.registration.last_name}` : '';
  const visibleStages = visibleSummaryStages(summary);

  return (
    <div className="scoring-nav-root">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 scoring-nav-pinned">
        <button
          onClick={onBack}
          className="flex cursor-pointer items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline mb-2 min-h-11"
        >
          ← {t('results.backToResults')}
        </button>
        <span className="text-xl font-bold dark:text-white">{shooterName}</span>
        {summary && (
          <div className="flex gap-1 flex-wrap mt-1">
            {summary.registration.division_applies !== false && (
              <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded">{divisionLabel(summary.registration.division)}</span>
            )}
            <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">{categoryLabel(summary.registration.category)}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${summary.registration.power_factor === 'major' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'}`}>
              {powerFactorLabel(summary.registration.power_factor)}
            </span>
          </div>
        )}
      </div>

      <div className="scoring-scroll-area p-4">
        {loading && <div className="text-center py-8 text-gray-500">{t('results.loading')}</div>}
        {!loading && !summary && <div className="text-center py-8 text-gray-500">{t('results.summaryNotAvailable')}</div>}
        {!loading && summary && visibleStages.length === 0 && (
          <div className="text-center py-8 text-gray-500">{t('results.summaryNotAvailable')}</div>
        )}
        {!loading && summary && visibleStages.map((stageData) => (
          <StageSummaryCard
            key={stageData.stage.id}
            stageData={stageData}
            powerFactor={summary.registration.power_factor as PowerFactor}
          />
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 flex justify-center scoring-nav-pinned">
        <Button color="gray" onClick={onBack} className="min-h-11 w-full sm:w-auto">{t('results.backToResults')}</Button>
      </div>
    </div>
  );
}

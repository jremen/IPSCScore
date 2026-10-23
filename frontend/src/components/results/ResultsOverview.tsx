import { useTranslation } from 'react-i18next';
import { twMerge } from 'tailwind-merge';
import ExportButtons from './ExportButtons';
import ShooterSummaryView from './ShooterSummaryModal';
import DivisionResultsContent from './DivisionResultsContent';
import OverallResultsContent from './OverallResultsContent';
import StageResultsContent from './StageResultsContent';
import CategoryResultsContent from './CategoryResultsContent';
import TagResultsContent from './TagResultsContent';
import { useResultsOverview } from '../../hooks/useResultsOverview';
import { resultTabClass } from '../../utils/resultsTabs';
import type { ResultsOverviewProps } from './types';

export default function ResultsOverview({ isPublic, matchOverride }: ResultsOverviewProps) {
  const { t } = useTranslation();
  const {
    activeMatchId,
    activeMatch,
    setActiveTab,
    effectiveTab,
    visibleTabs,
    divisionsApply,
    selectedRegistrationId,
    loading,
    overallResults,
    dqOverall,
    divisionResults,
    dqDivisions,
    stageResults,
    categoryResults,
    dqCategories,
    tagResults,
    dqTags,
    shooterSummary,
    shooterSummaryLoading,
    handleShooterClick,
    handleCloseSummary,
  } = useResultsOverview({ isPublic, matchOverride });

  if (!activeMatchId) {
    return <p className="p-4 text-gray-500 text-center">{t('results.noMatch')}</p>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="print-match-header print-only hidden">
        <h1>{activeMatch?.name || 'Match'}</h1>
        {activeMatch?.date && (
          <p>
            {activeMatch.organization} •{' '}
            {new Date(activeMatch.date).toLocaleDateString(document.documentElement.lang || 'en', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
      </div>

      <div className={twMerge(
        'sticky before:bg-gray-200 eink:before:bg-white pb-3 dark:before:bg-gray-900 before:absolute before:h-4 before:-top-4 before:w-full bg-gray-200 dark:bg-gray-900 z-100',
        isPublic ? 'top-19.5' : 'top-4',
      )}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-xl font-bold dark:text-white">{t('results.title')}</h2>
          <ExportButtons activeTab={effectiveTab} />
        </div>

        <div className="flex flex-wrap gap-x-1 border-b border-gray-200 dark:border-gray-700 -mb-px" role="tablist">
          {visibleTabs.map(({ key, labelKey }) => (
            <button
              key={key}
              role="tab"
              aria-selected={effectiveTab === key}
              onClick={() => setActiveTab(key)}
              className={resultTabClass(effectiveTab === key)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {selectedRegistrationId !== null ? (
          <ShooterSummaryView
            summary={shooterSummary}
            loading={shooterSummaryLoading}
            onBack={handleCloseSummary}
          />
        ) : (
          <>
            {effectiveTab === 'byDivision' && divisionsApply && (
              <DivisionResultsContent
                divisionResults={divisionResults}
                dqDivisions={dqDivisions}
                loading={loading}
                onShooterClick={handleShooterClick}
              />
            )}
            {effectiveTab === 'overall' && (
              <OverallResultsContent
                overallResults={overallResults}
                dqOverall={dqOverall}
                onShooterClick={handleShooterClick}
              />
            )}
            {effectiveTab === 'byStage' && (
              <StageResultsContent stageResults={stageResults} onShooterClick={handleShooterClick} />
            )}
            {effectiveTab === 'byCategory' && (
              <CategoryResultsContent categoryResults={categoryResults} dqCategories={dqCategories} />
            )}
            {effectiveTab === 'byTag' && (
              <TagResultsContent tagResults={tagResults} dqTags={dqTags} />
            )}
          </>
        )}
      </div>

      {loading && <p className="text-gray-500 text-center mt-4">{t('results.loading')}</p>}
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { divisionLabel } from '../../utils/constants';
import ResultsTable from './ResultsTable';
import { useStageResultsContent } from '../../hooks/useStageResultsContent';
import type { StageContentProps } from './types';

export default function StageResultsContent({ stageResults, onShooterClick }: StageContentProps) {
  const { t } = useTranslation();
  const { items } = useStageResultsContent(stageResults);

  return (
    <>
      <h2 className="print-only hidden text-lg font-bold mb-2">{t('results.byStage')}</h2>
      {items.map(({ stage, profile, divisionApplies, columnsFor }) => (
        <div key={stage.stage_id} className="mb-6 division-results-section">
          <h3 className="font-semibold mb-2 dark:text-white">
            {t('scoring.stage', { number: stage.stage_number })}: {stage.stage_name}
          </h3>
          {stage.divisions && Object.keys(stage.divisions).length > 0 ? (
            Object.entries(stage.divisions as Record<string, any[]>)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([division, scores]) => (
                <div key={division} className="division-results-section mb-4 ml-2">
                  {divisionApplies && (
                    <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">{divisionLabel(division)}</h4>
                  )}
                  <ResultsTable results={scores} columns={columnsFor(scores, false)} onShooterClick={onShooterClick} />
                </div>
              ))
          ) : (
            <ResultsTable
              results={stage.scores}
              columns={columnsFor(stage.scores || [], divisionApplies)}
              onShooterClick={onShooterClick}
            />
          )}
          {stage.dq_scores && stage.dq_scores.length > 0 && (
            <div className="mt-2 border border-red-300 rounded-lg overflow-hidden">
              <h4 className="font-semibold text-sm px-3 py-1 bg-red-50 dark:bg-red-900/20 dark:text-red-300 text-red-700">
                ⛔ {t('results.disqualified')}
              </h4>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-1 text-left dark:text-gray-300">{t('results.shooter')}</th>
                      {divisionApplies && <th className="px-3 py-1 text-left dark:text-gray-300">{t('results.division')}</th>}
                      {profile === 'zone' && (
                        <>
                          <th className="px-3 py-1 text-right dark:text-gray-300">HF</th>
                          <th className="px-3 py-1 text-right dark:text-gray-300">{t('results.netPoints')}</th>
                        </>
                      )}
                      <th className="px-3 py-1 text-left dark:text-gray-300">{t('results.dqReason')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stage.dq_scores.map((score: any) => (
                      <tr key={score.registration_id} className="bg-red-50 dark:bg-red-900/10">
                        <td className="px-3 py-1 dark:text-white">{score.first_name} {score.last_name}</td>
                        {divisionApplies && <td className="px-3 py-1 dark:text-white">{divisionLabel(score.division)}</td>}
                        {profile === 'zone' && (
                          <>
                            <td className="px-3 py-1 text-right dark:text-white">{score.hit_factor?.toFixed(4)}</td>
                            <td className="px-3 py-1 text-right dark:text-white">{score.net_points?.toFixed(2)}</td>
                          </>
                        )}
                        <td className="px-3 py-1 text-red-600 dark:text-red-400">{score.dq_reason || 'DQ'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="sm:hidden divide-y dark:divide-gray-700">
                {stage.dq_scores.map((score: any) => (
                  <div key={score.registration_id} className="px-3 py-2.5 bg-red-50 dark:bg-red-900/10">
                    <div className="font-medium dark:text-white">{score.first_name} {score.last_name}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-sm">
                      {divisionApplies && (
                        <span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">{t('results.division')}</span>{' '}
                          <span className="dark:text-white">{divisionLabel(score.division)}</span>
                        </span>
                      )}
                      {profile === 'zone' && (
                        <>
                          <span>
                            <span className="text-gray-500 dark:text-gray-400 text-xs">HF</span>{' '}
                            <span className="font-mono dark:text-white">{score.hit_factor?.toFixed(4)}</span>
                          </span>
                          <span>
                            <span className="text-gray-500 dark:text-gray-400 text-xs">{t('results.netPoints')}</span>{' '}
                            <span className="font-mono dark:text-white">{score.net_points?.toFixed(2)}</span>
                          </span>
                        </>
                      )}
                      <span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{t('results.dqReason')}</span>{' '}
                        <span className="text-red-600 dark:text-red-400">{score.dq_reason || 'DQ'}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ringValuesForStage, scoringTypeProfile } from '../../utils/resultsProfile';
import { mapSummaryScore, mapSummaryStage } from '../../utils/shooterSummary';
import { formatTimeDisplay } from '../../utils/timeFormat';
import type { ShooterSummaryTarget } from '../../types/results';
import type { StageSummaryCardProps } from './types';

export default function StageSummaryCard({ stageData }: StageSummaryCardProps) {
  const { t } = useTranslation();

  const stage = mapSummaryStage(stageData.stage);
  const score = mapSummaryScore(stageData.score);
  const profile = scoringTypeProfile(stage.scoring_type, stage.config);

  if (profile === 'ring') {
    const ringValues: number[] = score.score_data?.ring_values ?? [];
    const configured = ringValuesForStage(stage.scoring_type, stage.config);
    const displayValues = configured.length > 0
      ? configured
      : [...new Set(ringValues)].sort((a, b) => b - a);
    const counts: Record<number, number> = {};
    for (const value of ringValues) counts[value] = (counts[value] ?? 0) + 1;

    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3">
        <h4 className="font-semibold text-sm dark:text-white mb-2">
          {t('scoring.stage', { number: stage.stage_number })}: {stage.name}
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="dark:text-gray-300 font-semibold">{t('results.points')}</span>
          <span className="font-mono text-right font-semibold dark:text-white">{Number(stageData.score.net_points).toFixed(2)}</span>
          {displayValues.map((value) => (
            <Fragment key={value}>
              <span className="dark:text-gray-300">{value === 11 ? 'X' : value === 0 ? t('results.ringMiss') : value}</span>
              <span className="font-mono text-right dark:text-white">{counts[value] ?? 0}</span>
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  if (profile === 'hit_count') {
    const hits = score.targets.filter((target: ShooterSummaryTarget) => target.target_data?.hit === true).length;
    const misses = Math.max(0, score.targets.length - hits);

    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3">
        <h4 className="font-semibold text-sm dark:text-white mb-2">
          {t('scoring.stage', { number: stage.stage_number })}: {stage.name}
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="dark:text-gray-300">{t('results.hits')}</span>
          <span className="font-mono text-right dark:text-white">{hits}</span>
          <span className="dark:text-gray-300">{t('results.misses')}</span>
          <span className="font-mono text-right dark:text-white">{misses}</span>
          <span className="dark:text-gray-300 font-semibold">{t('results.points')}</span>
          <span className="font-mono text-right font-semibold dark:text-white">{Number(stageData.score.net_points).toFixed(2)}</span>
        </div>
      </div>
    );
  }

  const steelTargets = score.targets.filter((target: ShooterSummaryTarget) => target.target_type === 'steel');
  const totalAlpha = score.targets.reduce((sum: number, target: ShooterSummaryTarget) => sum + target.alpha, 0) + steelTargets.filter((target) => target.steel_hit === true).length;
  const totalCharlie = score.targets.reduce((sum: number, target: ShooterSummaryTarget) => sum + target.charlie, 0);
  const totalDelta = score.targets.reduce((sum: number, target: ShooterSummaryTarget) => sum + target.delta, 0);
  const totalMiss = score.targets.reduce((sum: number, target: ShooterSummaryTarget) => sum + target.miss, 0) + steelTargets.filter((target) => target.steel_hit === false).length;
  const totalNS = score.targets.reduce((sum: number, target: ShooterSummaryTarget) => sum + target.no_shoot_hits, 0);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3">
      <h4 className="font-semibold text-sm dark:text-white mb-2">
        {t('scoring.stage', { number: stage.stage_number })}: {stage.name}
      </h4>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-2">
        <span className="dark:text-gray-300">A</span>
        <span className="font-mono text-right dark:text-white">{totalAlpha}</span>
        <span className="dark:text-gray-300">C</span>
        <span className="font-mono text-right dark:text-white">{totalCharlie}</span>
        <span className="dark:text-gray-300">D</span>
        <span className="font-mono text-right dark:text-white">{totalDelta}</span>
        <span className="dark:text-gray-300">{t('scoring.misses')}</span>
        <span className="font-mono text-right dark:text-white">{totalMiss}</span>
        <span className="dark:text-gray-300">{t('scoring.noShootHits')}</span>
        <span className="font-mono text-right dark:text-white">{totalNS}</span>
        <span className="dark:text-gray-300">{t('scoring.procedurals')}</span>
        <span className="font-mono text-right dark:text-white">{stageData.score.procedural_count ?? 0}</span>
      </div>

      <hr className="border-gray-200 dark:border-gray-700 mb-2" />

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {score.time !== null && (
          <>
            <span className="dark:text-gray-300">{t('scoring.time')}</span>
            <span className="font-mono text-right dark:text-white">{formatTimeDisplay(score.time)}</span>
          </>
        )}
        <span className="dark:text-gray-300">{t('scoring.rawPoints')}</span>
        <span className="font-mono text-right dark:text-white">{stageData.score.raw_points}</span>
        {stageData.score.penalty_points > 0 && (
          <>
            <span className="dark:text-gray-300">{t('scoring.penaltyPoints')}</span>
            <span className="font-mono text-right text-red-600">−{stageData.score.penalty_points}</span>
          </>
        )}
        <span className="dark:text-gray-300 font-semibold">{t('scoring.netPoints')}</span>
        <span className="font-mono text-right font-semibold dark:text-white">{stageData.score.net_points}</span>
        <span className="dark:text-gray-300">{t('scoring.hitFactor')}</span>
        <span className="font-mono text-right dark:text-white">{stageData.score.hit_factor?.toFixed(4)}</span>
        <span className="dark:text-gray-300">{t('scoring.stagePoints')}</span>
        <span className="font-mono text-right dark:text-white">{stageData.score.stage_points?.toFixed(2) ?? '—'}</span>
        <span className="dark:text-gray-300">{t('scoring.stagePercent')}</span>
        <span className="font-mono text-right dark:text-white">{stageData.score.stage_percent?.toFixed(2) ?? '—'}%</span>
      </div>
    </div>
  );
}

import { formatTimeDisplay } from '../../../utils/timeFormat';
import { SummarySheetLayout } from '../shared/SummarySheetLayout';
import { useIPSCSummary } from '../../../hooks/useIPSCSummary';
import type { ScoreSummarySheetProps } from '../ScoreSummarySheet';

export default function IPSCSummary(props: ScoreSummarySheetProps) {
  const { stage, score, shooterName, onBack, onApprove } = props;
  const {
    t,
    npmTargets,
    totalAlpha,
    totalCharlie,
    totalDelta,
    totalMiss,
    totalNS,
    totalNPM,
    preview,
    totalPenalties,
    badges,
  } = useIPSCSummary(props);

  return (
    <SummarySheetLayout shooterName={shooterName} badges={badges} onBack={onBack} onApprove={onApprove}>
      <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xl">
          <span className="">A</span>
          <span className="font-mono text-right">{totalAlpha}</span>
          <span className="">C</span>
          <span className="font-mono text-right">{totalCharlie}</span>
          <span className="">D</span>
          <span className="font-mono text-right">{totalDelta}</span>
          <span className="">{t('scoring.misses')}</span>
          <span className="font-mono text-right">{totalMiss}</span>
          <span className="">{t('scoring.noShootHits')}</span>
          <span className="font-mono text-right">{totalNS}</span>
          {npmTargets.length > 0 && (
            <>
              <span className="">{t('scoring.npmTargets')}</span>
              <span className="font-mono text-right">{totalNPM}</span>
            </>
          )}
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xl dark:text-white">
          {score.procedural_count > 0 && (
            <>
              <span className="">{t('scoring.procedurals')}</span>
              <span className="font-mono text-right text-red-600">−{score.procedural_count * 10}</span>
            </>
          )}
          {score.ftsa_count > 0 && (
            <>
              <span className="">{t('scoring.ftsa')}</span>
              <span className="font-mono text-right text-red-600">−{score.ftsa_count * 10}</span>
            </>
          )}
          {score.extra_shot_count > 0 && (
            <>
              <span className="">{t('scoring.extraShots')}</span>
              <span className="font-mono text-right text-red-600">−{score.extra_shot_count * 10}</span>
            </>
          )}
          {score.extra_hit_count > 0 && (
            <>
              <span className="">{t('scoring.extraHits')}</span>
              <span className="font-mono text-right text-red-600">−{score.extra_hit_count * 10}</span>
            </>
          )}
          {score.stacking_count > 0 && (
            <>
              <span className="">{t('scoring.stacking')}</span>
              <span className="font-mono text-right text-red-600">−{score.stacking_count * 10}</span>
            </>
          )}
          {score.overtime_shot_count > 0 && (
            <>
              <span className="">{t('scoring.overtime')}</span>
              <span className="font-mono text-right text-red-600">−{score.overtime_shot_count * 5}</span>
            </>
          )}
          {totalPenalties === 0 && (
            <>
              <span className="">{t('scoring.penalties')}</span>
              <span className="font-mono text-right">0</span>
            </>
          )}
          {totalPenalties > 0 && (
            <>
              <span className="font-semibold">{t('scoring.totalPenalties')}</span>
              <span className="font-mono text-right text-red-600 font-semibold">−{preview.penalty_points}</span>
            </>
          )}
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xl dark:text-white font-medium">
          {score.time !== null && (
            <>
              <span>{t('scoring.time')}</span>
              <span className="font-mono text-right">{formatTimeDisplay(score.time)}</span>
            </>
          )}
          <span>{t('scoring.raw')}</span>
          <span className="font-mono text-right">{preview.raw_points}</span>
          <span>{t('scoring.net')}</span>
          <span className="font-mono text-right">{preview.net_points}</span>
          {stage.scoring_type !== 'fixed_time' && (
            <>
              <span>{t('scoring.hf')}</span>
              <span className="font-mono text-right">{preview.hit_factor.toFixed(4)}</span>
            </>
          )}
        </div>
      </div>
    </SummarySheetLayout>
  );
}

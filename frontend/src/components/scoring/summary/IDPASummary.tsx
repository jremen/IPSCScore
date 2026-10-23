import { formatTimeDisplay } from '../../../utils/timeFormat';
import { SummarySheetLayout } from '../shared/SummarySheetLayout';
import { useIDPASummary } from '../../../hooks/useIDPASummary';
import type { ScoreSummarySheetProps } from '../ScoreSummarySheet';

export default function IDPASummary(props: ScoreSummarySheetProps) {
  const { score, shooterName, onBack, onApprove } = props;
  const { t, totalAlpha, totalCharlie, totalDelta, totalMiss, totalNS, preview, badges } =
    useIDPASummary(props);

  return (
    <SummarySheetLayout shooterName={shooterName} badges={badges} onBack={onBack} onApprove={onApprove}>
      <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl">
          <span className="">-0 (A)</span>
          <span className="font-mono text-right">{totalAlpha}</span>
          <span className="">-1 (C)</span>
          <span className="font-mono text-right">{totalCharlie}</span>
          <span className="">-3 (D)</span>
          <span className="font-mono text-right">{totalDelta}</span>
          <span className="">{t('scoring.misses')}</span>
          <span className="font-mono text-right">{totalMiss}</span>
          <span className="">{t('scoring.noShootHits')}</span>
          <span className="font-mono text-right">{totalNS}</span>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl font-medium">
          <span>{t('scoring.ptsDown')}</span>
          <span className="font-mono text-right">{preview.raw_points}</span>
          <span>{t('scoring.penalties')}</span>
          <span className="font-mono text-right text-red-600">+{preview.penalty_points}s</span>
          <span>{t('scoring.time')}</span>
          <span className="font-mono text-right">{formatTimeDisplay(score.time)}</span>
          <span>{t('scoring.totalTime')}</span>
          <span className="font-mono text-right font-bold">{preview.total_time?.toFixed(2)}s</span>
        </div>
      </div>
    </SummarySheetLayout>
  );
}

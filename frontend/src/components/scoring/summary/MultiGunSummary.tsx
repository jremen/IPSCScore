import { formatTimeDisplay } from '../../../utils/timeFormat';
import { SummarySheetLayout } from '../shared/SummarySheetLayout';
import { useMultiGunSummary } from '../../../hooks/useMultiGunSummary';
import type { ScoreSummarySheetProps } from '../ScoreSummarySheet';

export default function MultiGunSummary(props: ScoreSummarySheetProps) {
  const { score, shooterName, onBack, onApprove } = props;
  const { t, neutralized, totalTargets, preview } = useMultiGunSummary(props);

  return (
    <SummarySheetLayout shooterName={shooterName} onBack={onBack} onApprove={onApprove}>
      <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl">
          <span className="">{t('scoring.targets')}</span>
          <span className="font-mono text-right">{neutralized}/{totalTargets}</span>
          <span className="">{t('scoring.rawTime')}</span>
          <span className="font-mono text-right">{formatTimeDisplay(score.time)}</span>
          <span className="">{t('scoring.penalties')}</span>
          <span className="font-mono text-right text-red-600">+{preview.penalty_points}s</span>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl font-medium">
          <span>{t('scoring.totalTime')}</span>
          <span className="font-mono text-right font-bold">{preview.total_time?.toFixed(2)}s</span>
        </div>
      </div>
    </SummarySheetLayout>
  );
}

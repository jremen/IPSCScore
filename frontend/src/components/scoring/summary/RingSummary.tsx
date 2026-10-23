import { SummarySheetLayout } from '../shared/SummarySheetLayout';
import { useRingSummary } from '../../../hooks/useRingSummary';
import type { ScoreSummarySheetProps } from '../ScoreSummarySheet';

export default function RingSummary(props: ScoreSummarySheetProps) {
  const { shooterName, onBack, onApprove } = props;
  const { t, preview } = useRingSummary(props);

  return (
    <SummarySheetLayout shooterName={shooterName} onBack={onBack} onApprove={onApprove}>
      <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl font-medium">
          <span>{t('scoring.totalScore')}</span>
          <span className="font-mono text-right font-bold">{preview.raw_points}</span>
          {preview.x_count !== undefined && preview.x_count > 0 && (
            <>
              <span>{t('scoring.xCount')}</span>
              <span className="font-mono text-right">{preview.x_count}</span>
            </>
          )}
        </div>
      </div>
    </SummarySheetLayout>
  );
}

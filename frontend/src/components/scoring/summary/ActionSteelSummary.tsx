import { Fragment } from 'react';
import { SummarySheetLayout } from '../shared/SummarySheetLayout';
import { useActionSteelSummary } from '../../../hooks/useActionSteelSummary';
import type { ScoreSummarySheetProps } from '../ScoreSummarySheet';

export default function ActionSteelSummary(props: ScoreSummarySheetProps) {
  const { shooterName, onBack, onApprove } = props;
  const { t, stringTimes, preview } = useActionSteelSummary(props);

  return (
    <SummarySheetLayout shooterName={shooterName} onBack={onBack} onApprove={onApprove}>
      <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl">
          {stringTimes.map((time, index) => (
            <Fragment key={index}>
              <span className="">{t('scoring.stringN', { number: index + 1 })}</span>
              <span className="font-mono text-right">{time > 0 ? time.toFixed(2) : '—'}</span>
            </Fragment>
          ))}
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

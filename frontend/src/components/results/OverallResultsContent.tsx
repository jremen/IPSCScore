import { useTranslation } from 'react-i18next';
import ResultsTable from './ResultsTable';
import DqTable from './DqTable';
import { useOverallResultsContent } from '../../hooks/useOverallResultsContent';
import type { OverallContentProps } from './types';

export default function OverallResultsContent({ overallResults, dqOverall, onShooterClick }: OverallContentProps) {
  const { t } = useTranslation();
  const { divisionApplies, columns } = useOverallResultsContent(overallResults, dqOverall);

  return (
    <>
      <h2 className="print-only hidden text-lg font-bold mb-2">{t('results.overall')}</h2>
      <ResultsTable results={overallResults} columns={columns} onShooterClick={onShooterClick} />
      <DqTable dqShooters={dqOverall} showDivision={divisionApplies} />
    </>
  );
}

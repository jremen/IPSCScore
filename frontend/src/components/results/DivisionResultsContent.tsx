import { useTranslation } from 'react-i18next';
import { divisionLabel } from '../../utils/constants';
import ResultsTable from './ResultsTable';
import DqTable from './DqTable';
import { useDivisionResultsContent } from '../../hooks/useDivisionResultsContent';
import type { DivisionContentProps } from './types';

export default function DivisionResultsContent({ divisionResults, dqDivisions, loading, onShooterClick }: DivisionContentProps) {
  const { t } = useTranslation();
  const { scoredData, divisionApplies, columns } = useDivisionResultsContent(divisionResults, dqDivisions);

  return (
    <>
      <h2 className="print-only hidden text-lg font-bold mb-2">{t('results.byDivision')}</h2>
      {Object.keys(divisionResults).length === 0 && !loading && (
        <p className="text-gray-500 text-center mt-4">{t('results.empty')}</p>
      )}
      {Object.entries(divisionResults)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([division, results]) => (
          <div key={division} className="division-results-section mb-6">
            {divisionApplies && (
              <h3 className="font-semibold text-lg mb-2 dark:text-white">{divisionLabel(division)}</h3>
            )}
            <ResultsTable scored={scoredData} results={results} columns={columns} onShooterClick={onShooterClick} />
          </div>
        ))}
      <DqTable dqShooters={dqDivisions} showDivision={divisionApplies} />
    </>
  );
}

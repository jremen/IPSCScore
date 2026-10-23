import { useTranslation } from 'react-i18next';
import { divisionLabel } from '../../utils/constants';
import { useConstLabels } from '../../hooks/useConstLabels';
import ResultsTable from './ResultsTable';
import DqTable from './DqTable';
import { useCategoryResultsContent } from '../../hooks/useCategoryResultsContent';
import type { CategoryContentProps } from './types';

export default function CategoryResultsContent({ categoryResults, dqCategories }: CategoryContentProps) {
  const { t } = useTranslation();
  const { categoryLabel } = useConstLabels();
  const { dqShowDivision, sections } = useCategoryResultsContent(categoryResults, dqCategories);

  return (
    <>
      <h2 className="print-only hidden text-lg font-bold mb-2">{t('results.byCategory')}</h2>
      {sections.map(({ category, divisions, divisionApplies, columns }) => (
        <div key={category} className="mb-6 division-results-section">
          <h3 className="font-semibold text-lg mb-2 dark:text-white">{categoryLabel(category)}</h3>
          {Object.entries(divisions)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([division, results]) => (
              <div key={division} className="mb-4 ml-2">
                {divisionApplies && (
                  <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">{divisionLabel(division)}</h4>
                )}
                <ResultsTable results={results} columns={columns} />
              </div>
            ))}
        </div>
      ))}
      <DqTable dqShooters={dqCategories} showDivision={dqShowDivision} />
    </>
  );
}

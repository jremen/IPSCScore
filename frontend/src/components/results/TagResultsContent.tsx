import { useTranslation } from 'react-i18next';
import { divisionLabel } from '../../utils/constants';
import ResultsTable from './ResultsTable';
import DqTable from './DqTable';
import { useTagResultsContent } from '../../hooks/useTagResultsContent';
import type { TagContentProps } from './types';

export default function TagResultsContent({ tagResults, dqTags }: TagContentProps) {
  const { t } = useTranslation();
  const { dqShowDivision, sections } = useTagResultsContent(tagResults, dqTags);

  return (
    <>
      <h2 className="print-only hidden text-lg font-bold mb-2">{t('results.byTag')}</h2>
      {sections.map(({ tag, divisions, divisionApplies, columns }) => (
        <div key={tag} className="mb-6 division-results-section">
          <h3 className="font-semibold text-lg mb-2 dark:text-white">{t('results.tag', { tag })}</h3>
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
      {Object.keys(tagResults).length === 0 && <p className="text-gray-500 text-center">{t('results.noTags')}</p>}
      <DqTable dqShooters={dqTags} showDivision={dqShowDivision} />
    </>
  );
}

import { useTranslation } from 'react-i18next';
import { categoryLabel, divisionLabel } from '../../utils/constants';
import CupResultsTable from './CupResultsTable';
import type { CupDetailResultsProps } from './types';

export default function CupDetailResults({ results, tab, mode, getLimitedRows }: CupDetailResultsProps) {
  const { t } = useTranslation();

  if (results.matches.length === 0) {
    return <p className="text-gray-500 mt-4">{t('cups.noMatches')}</p>;
  }

  if (tab === 'byDivision') {
    return (
      <div>
        {Object.entries(results.results.byDivision)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([division, rows]) => (
            <div key={division} className="mb-6">
              <h3 className="font-semibold text-lg mb-2 dark:text-white">{divisionLabel(division)}</h3>
              <CupResultsTable rows={getLimitedRows(rows)} matches={results.matches} mode={mode} hasDivision={false} />
            </div>
          ))}
        {Object.keys(results.results.byDivision).length === 0 && (
          <p className="text-gray-500 mt-4">{t('cups.noQualified')}</p>
        )}
      </div>
    );
  }

  if (tab === 'overall') {
    return (
      <div>
        <CupResultsTable rows={getLimitedRows(results.results.overall)} matches={results.matches} mode={mode} hasDivision />
      </div>
    );
  }

  if (tab === 'byCategory') {
    return (
      <div>
        {Object.entries(results.results.byCategory)
          .filter(([category]) => category !== 'regular')
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, divisions]) => (
            <div key={category} className="mb-6">
              <h3 className="font-semibold text-lg mb-2 dark:text-white">{categoryLabel(category)}</h3>
              {Object.entries(divisions)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([division, rows]) => (
                  <div key={division} className="mb-4 ml-2">
                    <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">{divisionLabel(division)}</h4>
                    <CupResultsTable rows={getLimitedRows(rows)} matches={results.matches} mode={mode} hasDivision={false} />
                  </div>
                ))}
            </div>
          ))}
      </div>
    );
  }

  return (
    <div>
      {Object.entries(results.results.byTag)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tag, divisions]) => (
          <div key={tag} className="mb-6">
            <h3 className="font-semibold text-lg mb-2 dark:text-white">{t('results.tag', { tag })}</h3>
            {Object.entries(divisions)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([division, rows]) => (
                <div key={division} className="mb-4 ml-2">
                  <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">{divisionLabel(division)}</h4>
                  <CupResultsTable rows={getLimitedRows(rows)} matches={results.matches} mode={mode} hasDivision={false} />
                </div>
              ))}
          </div>
        ))}
      {Object.keys(results.results.byTag).length === 0 && (
        <p className="text-gray-500 mt-4">{t('cups.noTags')}</p>
      )}
    </div>
  );
}

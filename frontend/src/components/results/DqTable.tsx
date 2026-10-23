import { useTranslation } from 'react-i18next';
import { divisionLabel } from '../../utils/constants';
import type { DqTableProps } from './types';

export default function DqTable({ dqShooters, showDivision = true }: DqTableProps) {
  const { t } = useTranslation();
  if (dqShooters.length === 0) return null;

  return (
    <div className="mb-6 border border-red-300 rounded-lg overflow-hidden dq-print-section">
      <h3 className="font-semibold text-lg mb-0 px-4 py-2 bg-red-50 dark:bg-red-900/20 dark:text-red-300 text-red-700">
        ⛔ {t('results.disqualified')}
      </h3>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">{t('results.shooter')}</th>
              {showDivision && <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">{t('results.division')}</th>}
              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">{t('results.dqReason')}</th>
            </tr>
          </thead>
          <tbody>
            {dqShooters.map((shooter) => (
              <tr key={shooter.registration_id} className="bg-red-50 dark:bg-red-900/10">
                <td className="px-4 py-2 dark:text-white">{shooter.first_name} {shooter.last_name}</td>
                {showDivision && <td className="px-4 py-2 dark:text-white">{divisionLabel(shooter.division)}</td>}
                <td className="px-4 py-2 text-red-600 dark:text-red-400">{shooter.dq_reason || 'DQ'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden divide-y dark:divide-gray-700">
        {dqShooters.map((shooter) => (
          <div key={shooter.registration_id} className="px-3 py-2.5 bg-red-50 dark:bg-red-900/10">
            <div className="font-medium dark:text-white">{shooter.first_name} {shooter.last_name}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-sm">
              {showDivision && (
                <span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">{t('results.division')}</span>{' '}
                  <span className="dark:text-white">{divisionLabel(shooter.division)}</span>
                </span>
              )}
              <span>
                <span className="text-gray-500 dark:text-gray-400 text-xs">{t('results.dqReason')}</span>{' '}
                <span className="text-red-600 dark:text-red-400">{shooter.dq_reason || 'DQ'}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

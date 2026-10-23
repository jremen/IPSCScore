import { useTranslation } from 'react-i18next';
import LanguageSelector from '../settings/LanguageSelector';
import { ThemeSelector } from '../settings/ThemeSelector';
import { usePublicSquadsView } from '../../hooks/usePublicSquadsView';

export default function PublicSquadsView() {
  const { t } = useTranslation();
  const {
    loading,
    error,
    matchName,
    squadData,
    sortedSquads,
    unassigned,
    isOffline,
    handleRetry,
  } = usePublicSquadsView();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('squads.loading')}</p>
        </div>
      </div>
    );
  }

  if (error === 'noCurrentMatch') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">📋 {t('squads.publicTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t('squads.noCurrentMatch')}</p>
          <div className="text-sm text-gray-400 dark:text-gray-500">squads.local</div>
          <div className="mt-4"><LanguageSelector /></div>
        </div>
      </div>
    );
  }

  if (error === 'loadError') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">📋 {t('squads.publicTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t('squads.loadError')}</p>
          <button onClick={handleRetry} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            {t('squads.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-200 dark:bg-gray-900">
      <header className="bg-gray-900 text-white sticky top-0 z-110 px-4 py-2 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">📋 {matchName || t('squads.publicTitle')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <ThemeSelector />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-purple-200 dark:text-white">
          {isOffline && (
            <span className="ml-2 px-1.5 py-0.5 bg-yellow-600 text-white rounded text-2.5 font-medium">
              {t('squads.offline')}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-prose mx-auto w-full px-4 py-6">
        {sortedSquads.length === 0 && unassigned.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">{t('squads.noShooters')}</div>
        ) : (
          <div className="space-y-6">
            {sortedSquads.map((squadNumber) => (
              <div key={squadNumber} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/30 border-b border-purple-100 dark:border-purple-800">
                  <h2 className="text-4xl font-bold text-purple-800 dark:text-purple-200">
                    {t('squads.squadN', { number: squadNumber })}
                    <span className="ml-2 text-sm font-normal text-purple-600 dark:text-purple-400">
                      ({t('squads.shooterCount', { count: squadData[squadNumber].length })})
                    </span>
                  </h2>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {squadData[squadNumber].map((registration, index) => (
                    <li key={registration.id} className="px-4 py-2.5 flex items-center gap-3">
                      <span className="text-xl text-gray-400 dark:text-gray-500 w-6 text-right tabular-nums">{index + 1}</span>
                      <span className="text-2xl text-gray-800 dark:text-gray-200">
                        {registration.first_name} {registration.last_name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

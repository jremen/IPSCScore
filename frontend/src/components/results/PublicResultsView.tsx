import { useTranslation } from 'react-i18next';
import ResultsOverview from './ResultsOverview';
import LanguageSelector from '../settings/LanguageSelector';
import { ThemeSelector } from '../settings/ThemeSelector';
import { usePublicResultsView } from '../../hooks/usePublicResultsView';

export default function PublicResultsView() {
  const { t } = useTranslation();
  const { loading, error, lastRefresh, matchName, publicMatch } = usePublicResultsView();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('results.loading')}</p>
        </div>
      </div>
    );
  }

  if (error === 'noCurrentMatch') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">🏆 {t('results.publicTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t('results.noCurrentMatch')}</p>
          <div className="text-sm text-gray-400 dark:text-gray-500">IP:3001/results</div>
          <div className="mt-4"><LanguageSelector /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-200 dark:bg-gray-900">
      <header className="bg-gray-900 text-white sticky top-0 z-110 px-4 py-2 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">🏆 {matchName || t('results.publicTitle')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <ThemeSelector />
          </div>
        </div>
        <div className="text-xs text-blue-200 dark:text-white">
          {t('results.autoRefresh', { time: lastRefresh.toLocaleTimeString() })}
        </div>
      </header>

      <main className="flex-1">
        <ResultsOverview isPublic matchOverride={publicMatch} />
      </main>
    </div>
  );
}

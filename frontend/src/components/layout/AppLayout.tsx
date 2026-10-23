import Header from './Header';
import TabBar from './TabBar';
import Matches from '../match/MatchList';
import Cups from '../cup/CupList';
import Stages from '../stage/StageList';
import ShooterDatabase from '../shooter/ShooterDatabase';
import Registration from '../registration/MatchRegistration';
import Scoring from '../scoring/ScoringNav';
import Results from '../results/ResultsOverview';
import AdminLoginPage from '../auth/AdminLoginPage';
import StageLoginPage from '../auth/StageLoginPage';
import PublicResultsView from '../results/PublicResultsView';
import PublicResultsKioskView from '../results/PublicResultsKioskView';
import PublicSquadsView from '../squads/PublicSquadsView';
import { useTranslation } from 'react-i18next';
import MenuActionListener from '../shared/MenuActionListener';
import { useAppLayout } from '../../hooks/useAppLayout';

export default function AppLayout() {
  const { t } = useTranslation();
  const {
    activeTab,
    isAuthenticated,
    isAdmin,
    isLocalNetwork,
    domainMode,
    authenticatedMatchId,
    sessionRestoring,
    isElectron,
    isScoringTab,
    isKioskResults,
  } = useAppLayout();

  const menuListener = isElectron ? <MenuActionListener /> : null;

  if (domainMode === 'results') {
    return isKioskResults ? <PublicResultsKioskView /> : <PublicResultsView />;
  }

  if (domainMode === 'squads') {
    return <PublicSquadsView />;
  }

  if (!isAuthenticated) {
    if (sessionRestoring) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('layout.restoringSession')}</div>
        </div>
      );
    }
    if (domainMode === 'scoring') {
      return <StageLoginPage />;
    }
    if (isLocalNetwork) {
      return <AdminLoginPage />;
    }
    return <StageLoginPage />;
  }

  if (!isAdmin && authenticatedMatchId) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {menuListener}
        <Header />
        <main className="flex-1 min-h-0 overflow-hidden lg:overflow-auto">
          <Scoring />
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-200 dark:bg-gray-900">
      {menuListener}
      <Header />
      <TabBar />
      <main className={`flex-1 min-h-0 ${isScoringTab ? 'overflow-hidden lg:overflow-auto' : 'overflow-auto'}`}>
        {activeTab === 'matches' && <Matches />}
        {activeTab === 'cups' && <Cups />}
        {activeTab === 'stages' && <Stages />}
        {activeTab === 'shooters' && <ShooterDatabase />}
        {activeTab === 'registration' && <Registration />}
        {activeTab === 'scoring' && <Scoring />}
        {activeTab === 'results' && <Results />}
      </main>
    </div>
  );
}

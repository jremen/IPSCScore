import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../stores/matchStore';
import { useUIStore } from '../stores/uiStore';

export function useMatchDetail() {
  const currentMatch = useMatchStore((s) => s.currentMatch);
  const fetchMatch = useMatchStore((s) => s.fetchMatch);
  const activeMatchId = useUIStore((s) => s.activeMatchId);
  const setActiveMatch = useUIStore((s) => s.setActiveMatch);
  const { t } = useTranslation();

  useEffect(() => {
    if (activeMatchId) fetchMatch(activeMatchId);
  }, [activeMatchId, fetchMatch]);

  const goBack = () => setActiveMatch(null);

  return { t, currentMatch, goBack };
}

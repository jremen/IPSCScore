import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { useUIStore } from '../stores/uiStore';
import { useMatchStore } from '../stores/matchStore';
import { useAuthStore } from '../stores/authStore';
import { useStageStore } from '../stores/stageStore';
import { useScoringStore } from '../stores/scoringStore';
import { useTabMenuAction } from './useTabMenuAction';

export function useHeader() {
  const activeMatchId = useUIStore((s) => s.activeMatchId);
  const currentMatch = useMatchStore((s) => s.currentMatch);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const authenticatedMatchId = useAuthStore((s) => s.authenticatedMatchId);
  const logout = useAuthStore((s) => s.logout);
  const adminLogout = useAuthStore((s) => s.adminLogout);
  const stages = useStageStore((s) => s.stages);
  const fetchStages = useStageStore((s) => s.fetchStages);
  const activeStageId = useScoringStore((s) => s.activeStageId);
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const isMobile = useRef(false);

  useEffect(() => {
    if (!isAdmin && authenticatedMatchId && stages.length === 0) {
      fetchStages(authenticatedMatchId);
    }
  }, [isAdmin, authenticatedMatchId, stages.length, fetchStages]);

  const currentStage = useMemo(
    () => (!isAdmin && activeStageId ? stages.find((stage) => stage.id === activeStageId) ?? null : null),
    [activeStageId, isAdmin, stages],
  );

  useTabMenuAction('open-preferences', () => {
    if (isAdmin) setShowSettings(true);
  });

  useEffect(() => {
    if (Capacitor.isNativePlatform()) isMobile.current = true;
  });

  const handleLogout = useCallback(() => {
    if (isAdmin) adminLogout();
    else logout();
  }, [adminLogout, isAdmin, logout]);

  return {
    t,
    activeMatchId,
    currentMatch,
    isAdmin,
    stages,
    currentStage,
    showSettings,
    showDetails,
    showPicker,
    showHelp,
    isMobile: isMobile.current,
    setShowSettings,
    setShowDetails,
    setShowPicker,
    setShowHelp,
    handleLogout,
  };
}

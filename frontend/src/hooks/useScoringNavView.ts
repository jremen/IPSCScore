import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../stores/scoringStore';
import { useStageStore } from '../stores/stageStore';
import { useUIStore } from '../stores/uiStore';
import { useConstLabels } from './useConstLabels';
import { useScoringNav } from './useScoringNav';
import { useTabMenuAction } from './useTabMenuAction';

export function useScoringNavView() {
  const activeMatchId = useUIStore((s) => s.activeMatchId);
  const registrations = useScoringStore((s) => s.registrations);
  const scoringProgress = useScoringStore((s) => s.scoringProgress);
  const currentRegistrationId = useScoringStore((s) => s.currentRegistrationId);
  const nextShooter = useScoringStore((s) => s.nextShooter);
  const prevShooter = useScoringStore((s) => s.prevShooter);
  const activeStageId = useScoringStore((s) => s.activeStageId);
  const stages = useStageStore((s) => s.stages);
  const { t } = useTranslation();
  const { categoryLabel, powerFactorLabel } = useConstLabels();
  const scoring = useScoringNav();
  const [showShooterList, setShowShooterList] = useState(false);

  useTabMenuAction('prev-shooter', () => prevShooter());
  useTabMenuAction('next-shooter', () => nextShooter());
  useTabMenuAction('confirm-score', () => {
    if (scoring.canConfirm) scoring.handleConfirm();
  });

  const shooterDetails = useMemo(
    () =>
      scoring.currentShooter
        ? {
            division: scoring.currentShooter.effective_division,
            category: scoring.currentShooter.effective_category,
            powerFactor: scoring.currentShooter.effective_power_factor,
          }
        : null,
    [
      scoring.currentShooter?.effective_division,
      scoring.currentShooter?.effective_category,
      scoring.currentShooter?.effective_power_factor,
    ],
  );

  const openShooterList = () => setShowShooterList(true);
  const closeShooterList = () => setShowShooterList(false);

  return {
    t,
    activeMatchId,
    registrations,
    scoringProgress,
    currentRegistrationId,
    activeStageId,
    stages,
    categoryLabel,
    powerFactorLabel,
    nextShooter,
    prevShooter,
    showShooterList,
    shooterDetails,
    openShooterList,
    closeShooterList,
    ...scoring,
  };
}

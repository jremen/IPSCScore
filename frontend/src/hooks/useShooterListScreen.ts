import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../stores/scoringStore';
import { useStageStore } from '../stores/stageStore';
import { useShooterList } from './useShooterList';
import { useEscClose } from './useEscClose';

export function useShooterListScreen(show: boolean, onClose: () => void, onSelect: (registrationId: string) => void) {
  const { t } = useTranslation();
  const currentRegistrationId = useScoringStore((s) => s.currentRegistrationId);
  const activeStageId = useScoringStore((s) => s.activeStageId);
  const stages = useStageStore((s) => s.stages);
  const currentStage = stages.find((stage) => stage.id === activeStageId) ?? null;
  const shooterList = useShooterList();

  useEscClose(show ? onClose : undefined);

  const selectShooter = useCallback(
    (registrationId: string) => {
      onSelect(registrationId);
      onClose();
    },
    [onClose, onSelect],
  );

  const stageLabel = currentStage
    ? `${t('scoring.stage', { number: currentStage.stage_number })}: ${currentStage.name}`
    : t('scoring.shooterList');

  return {
    t,
    currentRegistrationId,
    stageLabel,
    selectShooter,
    ...shooterList,
  };
}

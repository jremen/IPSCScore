import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../stores/scoringStore';
import { useStageStore } from '../stores/stageStore';
import { useEscClose } from './useEscClose';

export function useStagePickerModal(show: boolean, onClose: () => void) {
  const { t } = useTranslation();
  const stages = useStageStore((s) => s.stages);
  const activeStageId = useScoringStore((s) => s.activeStageId);
  const setActiveStageId = useScoringStore((s) => s.setActiveStageId);
  const registrations = useScoringStore((s) => s.registrations);
  const scoringProgress = useScoringStore((s) => s.scoringProgress);

  useEscClose(show ? onClose : undefined);

  const selectStage = useCallback(
    (stageId: string) => {
      setActiveStageId(stageId);
      onClose();
    },
    [onClose, setActiveStageId],
  );

  const stageScored = useCallback(
    (stageId: string) => {
      if (!scoringProgress || registrations.length === 0) return false;
      const scoredIds = new Set(
        scoringProgress.scored
          .filter((entry: { stage_id: string }) => entry.stage_id === stageId)
          .map((entry: { registration_id: string }) => entry.registration_id),
      );
      return registrations.every((registration) => registration.is_dq || scoredIds.has(registration.id));
    },
    [registrations, scoringProgress],
  );

  return { t, stages, activeStageId, selectStage, stageScored };
}

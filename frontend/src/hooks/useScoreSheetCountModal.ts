import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Stage } from '../types/stage';

export function useScoreSheetCountModal(stages: Stage[], onGenerate: () => void) {
  const { t } = useTranslation();
  const printableStages = stages.filter((stage) => stage.scoring_type !== 'chrono');

  const generate = useCallback(() => {
    if (printableStages.length === 0) return;
    onGenerate();
  }, [onGenerate, printableStages.length]);

  return { t, printableStages, generate };
}

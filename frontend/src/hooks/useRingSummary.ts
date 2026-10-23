import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateRingPreview } from '../utils/scoring';
import type { ScoreSummarySheetProps } from '../components/scoring/ScoreSummarySheet';

export function useRingSummary({ score }: ScoreSummarySheetProps) {
  const { t } = useTranslation();

  const ringValues: number[] = score.score_data?.ring_values || [];
  const preview = useMemo(() => calculateRingPreview(ringValues), [ringValues]);

  return { t, preview };
}

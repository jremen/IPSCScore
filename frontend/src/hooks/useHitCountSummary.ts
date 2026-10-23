import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateHitCountPreview } from '../utils/scoring';
import type { ScoreSummarySheetProps } from '../components/scoring/ScoreSummarySheet';

export function useHitCountSummary({ stage, score }: ScoreSummarySheetProps) {
  const { t } = useTranslation();

  const config = stage.config || {};
  const pointValue = config.point_value ?? 10;
  const hits = score.targets.filter((target) => target.target_data?.hit === true).length;
  const totalTargets = score.targets.length;
  const preview = useMemo(() => calculateHitCountPreview(hits, pointValue), [hits, pointValue]);

  return { t, hits, totalTargets, preview };
}

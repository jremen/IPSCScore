import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateActionSteelPreview } from '../utils/scoring';
import type { ScoreSummarySheetProps } from '../components/scoring/ScoreSummarySheet';

export function useActionSteelSummary({ stage, score }: ScoreSummarySheetProps) {
  const { t } = useTranslation();

  const sd = score.score_data || {};
  const stringTimes: number[] = sd.string_times || [];
  const stringHits: boolean[][] = sd.string_plate_hits || [];
  const config = stage.config || {};

  const preview = useMemo(
    () =>
      calculateActionSteelPreview({
        string_times: stringTimes,
        string_plate_hits: stringHits,
        drop_worst: config.drop_worst ?? 0,
        miss_penalty: 3,
        stop_plate_miss_cap: 30,
      }),
    [stringTimes, stringHits, config],
  );

  return { t, stringTimes, preview };
}

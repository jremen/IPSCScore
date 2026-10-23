import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateMultiGunPreview } from '../utils/scoring';
import type { ScoreSummarySheetProps } from '../components/scoring/ScoreSummarySheet';

export function useMultiGunSummary({ score }: ScoreSummarySheetProps) {
  const { t } = useTranslation();

  const sd = score.score_data || {};
  const neutralized = score.targets.filter((target) => target.target_data?.neutralized === true).length;
  const totalTargets = score.targets.length;

  const preview = useMemo(
    () =>
      calculateMultiGunPreview({
        time: score.time || 0,
        penalty_ftn_sec: Number(sd.penalty_ftn_sec) || 0,
        penalty_miss_sec: Number(sd.penalty_miss_sec) || 0,
        penalty_no_shoot_sec: Number(sd.penalty_no_shoot_sec) || 0,
        penalty_procedural_sec: Number(sd.penalty_procedural_sec) || 0,
      }),
    [score, sd],
  );

  return { t, neutralized, totalTargets, preview };
}

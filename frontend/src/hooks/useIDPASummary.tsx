import { useMemo } from 'react';
import { Badge } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useConstLabels } from './useConstLabels';
import { divisionLabel } from '../utils/constants';
import { calculateIDPAPreview } from '../utils/scoring';
import type { ScoreSummarySheetProps } from '../components/scoring/ScoreSummarySheet';

export function useIDPASummary({ stage, score, shooterDetails }: ScoreSummarySheetProps) {
  const { t } = useTranslation();
  const { categoryLabel } = useConstLabels();

  const paperTargets = score.targets.filter((target) => target.target_type === 'paper');
  const steelTargets = score.targets.filter((target) => target.target_type === 'steel');

  const totalAlpha =
    paperTargets.reduce((sum, target) => sum + target.alpha, 0) +
    steelTargets.filter((target) => target.steel_hit === true).length;
  const totalCharlie = paperTargets.reduce((sum, target) => sum + target.charlie, 0);
  const totalDelta = paperTargets.reduce((sum, target) => sum + target.delta, 0);
  const totalMiss =
    paperTargets.reduce((sum, target) => sum + target.miss, 0) +
    steelTargets.filter((target) => target.steel_hit === false).length;
  const totalNS = score.targets.reduce((sum, target) => sum + target.no_shoot_hits, 0);

  const sd = score.score_data || {};
  const preview = useMemo(
    () =>
      calculateIDPAPreview({
        targets: score.targets.map((target) => ({ ...target, hits_per_paper: stage.hits_per_paper })),
        time: score.time || 0,
        penalty_pe: Number(sd.penalty_pe) || 0,
        penalty_hnt: Number(sd.penalty_hnt) || 0,
        penalty_ftn: Number(sd.penalty_ftn) || 0,
        penalty_fp: Number(sd.penalty_fp) || 0,
        penalty_ftdr: Number(sd.penalty_ftdr) || 0,
      }),
    [score, stage, sd],
  );

  const badges = shooterDetails ? (
    <>
      <Badge color="blue">{divisionLabel(shooterDetails.division)}</Badge>
      <Badge color="gray">{categoryLabel(shooterDetails.category)}</Badge>
    </>
  ) : undefined;

  return { t, totalAlpha, totalCharlie, totalDelta, totalMiss, totalNS, preview, badges };
}

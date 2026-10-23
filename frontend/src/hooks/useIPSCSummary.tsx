import { useMemo } from 'react';
import { Badge } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useConstLabels } from './useConstLabels';
import { divisionLabel } from '../utils/constants';
import { calculatePreview } from '../utils/scoring';
import type { ScoreSummarySheetProps } from '../components/scoring/ScoreSummarySheet';

export function useIPSCSummary({ stage, score, shooterDetails }: ScoreSummarySheetProps) {
  const { t } = useTranslation();
  const { categoryLabel, powerFactorLabel } = useConstLabels();

  const paperTargets = score.targets.filter((target) => target.target_type === 'paper');
  const steelTargets = score.targets.filter((target) => target.target_type === 'steel');
  const npmTargets = score.targets.filter((target) => target.target_type === 'npm');

  const totalAlpha =
    paperTargets.reduce((sum, target) => sum + target.alpha, 0) +
    steelTargets.filter((target) => target.steel_hit === true).length;
  const totalCharlie = paperTargets.reduce((sum, target) => sum + target.charlie, 0);
  const totalDelta = paperTargets.reduce((sum, target) => sum + target.delta, 0);
  const totalMiss =
    paperTargets.reduce((sum, target) => sum + target.miss, 0) +
    steelTargets.filter((target) => target.steel_hit === false).length;
  const totalNS = score.targets.reduce((sum, target) => sum + target.no_shoot_hits, 0);
  const totalNPM = npmTargets.filter((target) => target.steel_hit === true).length;

  const preview = useMemo(
    () =>
      calculatePreview(
        score.targets.map((target) => ({ ...target, hits_per_paper: stage.hits_per_paper })),
        score.time,
        stage.scoring_type as any,
        shooterDetails!.powerFactor as any,
        score.procedural_count,
        score.ftsa_count,
        score.extra_shot_count,
        score.extra_hit_count,
        score.stacking_count,
        score.overtime_shot_count,
      ),
    [score, stage, shooterDetails!.powerFactor],
  );

  const totalPenalties =
    score.procedural_count +
    score.ftsa_count +
    score.extra_shot_count +
    score.extra_hit_count +
    score.stacking_count +
    score.overtime_shot_count;

  const badges = shooterDetails ? (
    <>
      <Badge color="blue">{divisionLabel(shooterDetails.division)}</Badge>
      <Badge color="gray">{categoryLabel(shooterDetails.category)}</Badge>
      <Badge color={shooterDetails.powerFactor === 'major' ? 'warning' : 'success'}>
        {powerFactorLabel(shooterDetails.powerFactor)}
      </Badge>
    </>
  ) : undefined;

  return {
    t,
    npmTargets,
    totalAlpha,
    totalCharlie,
    totalDelta,
    totalMiss,
    totalNS,
    totalNPM,
    preview,
    totalPenalties,
    badges,
  };
}

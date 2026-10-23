import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../stores/scoringStore';
import { useScoringReadOnly } from './useScoringReadOnly';
import { calculateHitCountPreview } from '../utils/scoring';
import type { ScoreInput } from '../types/scoring';
import type { Stage } from '../types/stage';

export function useHitCountScoring(stage: Stage, score: ScoreInput) {
  const { t } = useTranslation();
  const setScore = useScoringStore((s) => s.setScore);
  const shooter = useScoringStore((s) => s.registrations.find((r) => r.id === s.currentRegistrationId));
  const isReadOnly = useScoringReadOnly();

  const config = stage.config || {};
  const pointValue = config.point_value || 10;

  const toggleTargetHit = useCallback(
    (targetIndex: number) => {
      const newTargets = score.targets.map((target, index) => {
        if (index !== targetIndex) return target;
        const currentHit = target.target_data?.hit ?? false;
        return { ...target, target_data: { ...target.target_data, hit: !currentHit } };
      });
      setScore({ ...score, targets: newTargets });
    },
    [score, setScore],
  );

  const handleResetAll = useCallback(() => {
    const resetTargets = score.targets.map((target) => ({
      ...target,
      target_data: { ...target.target_data, hit: false },
    }));
    setScore({
      ...score,
      targets: resetTargets,
      time: null,
      procedural_count: 0,
      ftsa_count: 0,
      extra_shot_count: 0,
      extra_hit_count: 0,
      stacking_count: 0,
      overtime_shot_count: 0,
      is_dnf: false,
    });
  }, [score, setScore]);

  const handleDnfToggle = useCallback(() => {
    setScore({ ...score, is_dnf: !score.is_dnf });
  }, [score, setScore]);

  const hits = score.targets.filter((target) => target.target_data?.hit === true).length;
  const totalTargets = score.targets.length;
  const preview = calculateHitCountPreview(hits, pointValue);
  const typeLabelKey = stage.scoring_type === 'nrl22' ? 'scoring.nrl22Scoring' : 'scoring.longRangeScoring';
  const typeLabel = t(typeLabelKey);

  return {
    t,
    shooter,
    isReadOnly,
    pointValue,
    toggleTargetHit,
    handleResetAll,
    handleDnfToggle,
    hits,
    totalTargets,
    preview,
    typeLabel,
  };
}

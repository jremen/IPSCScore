import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../stores/scoringStore';
import { useScoreDataUpdater } from './useScoreDataUpdater';
import { useScoringReadOnly } from './useScoringReadOnly';
import { calculateRingPreview } from '../utils/scoring';
import type { ScoreInput } from '../types/scoring';
import type { Stage } from '../types/stage';

export function useRingScoring(stage: Stage, score: ScoreInput) {
  const { t } = useTranslation();
  const setScore = useScoringStore((s) => s.setScore);
  const { sd, updateScoreData } = useScoreDataUpdater(score);
  const shooter = useScoringStore((s) => s.registrations.find((r) => r.id === s.currentRegistrationId));
  const isReadOnly = useScoringReadOnly();

  const config = stage.config || {};
  const scoringType = stage.scoring_type;

  let ringValues: number[];
  let shotsCount: number;
  let label: string;

  if (scoringType === 'archery') {
    ringValues = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    shotsCount = (config.arrows_per_end as number) || 6;
    label = t('scoring.archery');
  } else if (scoringType === 'issf') {
    ringValues = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    shotsCount = (config.shots_per_course as number) || 60;
    label = t('scoring.shot');
  } else if (scoringType === 'long_range' && config.variant === 'f_class') {
    ringValues = [11, 10, 9, 8, 7, 6, 5];
    shotsCount = (config.shots_per_string as number) || 20;
    label = t('scoring.shot');
  } else {
    ringValues = [11, 10, 9, 8, 7, 6, 5];
    shotsCount = (config.shots_per_string as number) || 10;
    label = t('scoring.shot');
  }

  const currentRings: number[] =
    sd.ring_values?.length === shotsCount ? sd.ring_values! : new Array(shotsCount).fill(0);

  const cycleRingValue = useCallback(
    (index: number) => {
      const rings = [...currentRings];
      const current = rings[index];
      if (current === 0) {
        rings[index] = ringValues[0];
      } else {
        const currentIndex = ringValues.indexOf(current);
        rings[index] = currentIndex >= ringValues.length - 1 ? 0 : ringValues[currentIndex + 1];
      }
      updateScoreData({ ring_values: rings });
    },
    [currentRings, ringValues, updateScoreData],
  );

  const longPressRing = useCallback(
    (index: number) => {
      const rings = [...currentRings];
      rings[index] = 0;
      updateScoreData({ ring_values: rings });
    },
    [currentRings, updateScoreData],
  );

  const handleResetAll = useCallback(() => {
    setScore({
      ...score,
      targets: [],
      time: null,
      procedural_count: 0,
      ftsa_count: 0,
      extra_shot_count: 0,
      extra_hit_count: 0,
      stacking_count: 0,
      overtime_shot_count: 0,
      is_dnf: false,
      score_data: { ring_values: new Array(shotsCount).fill(0) },
    });
  }, [score, setScore, shotsCount]);

  const handleDnfToggle = useCallback(() => {
    setScore({ ...score, is_dnf: !score.is_dnf });
  }, [score, setScore]);

  const preview = calculateRingPreview(currentRings);
  const totalShots = currentRings.filter((value) => value > 0).length;

  const typeLabelKey =
    scoringType === 'archery'
      ? 'scoring.archery'
      : scoringType === 'bullseye'
        ? 'scoring.bullseye'
        : scoringType === 'issf'
          ? 'scoring.issf'
          : 'scoring.fclass';
  const typeLabel = t(typeLabelKey);
  const typeIcon =
    scoringType === 'archery' ? '🏹' : scoringType === 'bullseye' || scoringType === 'issf' ? '🎯' : '🔭';

  return {
    t,
    shooter,
    isReadOnly,
    scoringType,
    ringValues,
    shotsCount,
    label,
    currentRings,
    cycleRingValue,
    longPressRing,
    handleResetAll,
    handleDnfToggle,
    preview,
    totalShots,
    typeLabel,
    typeIcon,
  };
}

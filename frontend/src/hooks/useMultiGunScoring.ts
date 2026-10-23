import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../stores/scoringStore';
import { useScoreDataUpdater } from './useScoreDataUpdater';
import { useScoringReadOnly } from './useScoringReadOnly';
import { calculateMultiGunPreview } from '../utils/scoring';
import type { ScoreInput } from '../types/scoring';

export function useMultiGunScoring(score: ScoreInput) {
  const { t } = useTranslation();
  const setScore = useScoringStore((s) => s.setScore);
  const { sd, updateScoreData } = useScoreDataUpdater(score);
  const shooter = useScoringStore((s) => s.registrations.find((r) => r.id === s.currentRegistrationId));
  const isReadOnly = useScoringReadOnly();

  const penalty_ftn_sec = sd.penalty_ftn_sec || 0;
  const penalty_miss_sec = sd.penalty_miss_sec || 0;
  const penalty_no_shoot_sec = sd.penalty_no_shoot_sec || 0;
  const penalty_procedural_sec = sd.penalty_procedural_sec || 0;

  const paperTargets = useMemo(
    () => score.targets.filter((target) => target.target_type === 'paper'),
    [score.targets],
  );

  const toggleNeutralized = useCallback(
    (targetIndex: number) => {
      const newTargets = score.targets.map((target, index) => {
        if (target.target_type !== 'paper' || index !== targetIndex) return target;
        const currentNeutralized = target.target_data?.neutralized ?? false;
        return {
          ...target,
          steel_hit: null,
          target_data: { ...target.target_data, neutralized: !currentNeutralized },
        };
      });
      setScore({ ...score, targets: newTargets });
    },
    [score, setScore],
  );

  const handleTimeChange = useCallback(
    (value: number | null) => setScore({ ...score, time: value }),
    [score, setScore],
  );

  const handleResetAll = useCallback(() => {
    const resetTargets = score.targets.map((target) => ({
      ...target,
      target_data: { ...target.target_data, neutralized: false },
    }));
    setScore({
      ...score,
      time: null,
      targets: resetTargets,
      procedural_count: 0,
      ftsa_count: 0,
      extra_shot_count: 0,
      extra_hit_count: 0,
      stacking_count: 0,
      overtime_shot_count: 0,
      is_dnf: false,
      score_data: {
        penalty_ftn_sec: 0,
        penalty_miss_sec: 0,
        penalty_no_shoot_sec: 0,
        penalty_procedural_sec: 0,
      },
    });
  }, [score, setScore]);

  const handleDnfToggle = useCallback(() => {
    setScore({ ...score, is_dnf: !score.is_dnf });
  }, [score, setScore]);

  const handlePenaltyChange = useCallback(
    (
      key: 'penalty_ftn_sec' | 'penalty_miss_sec' | 'penalty_no_shoot_sec' | 'penalty_procedural_sec',
      delta: number,
    ) => {
      updateScoreData({ [key]: Math.max(0, ((sd[key] as number) || 0) + delta) });
    },
    [sd, updateScoreData],
  );

  const preview = calculateMultiGunPreview({
    time: score.time || 0,
    penalty_ftn_sec,
    penalty_miss_sec,
    penalty_no_shoot_sec,
    penalty_procedural_sec,
  });

  const penalties = [
    { key: 'penalty_ftn_sec' as const, label: t('scoring.ftnFailNeutralize'), sec: 5 },
    { key: 'penalty_miss_sec' as const, label: t('scoring.misses'), sec: 10 },
    { key: 'penalty_no_shoot_sec' as const, label: t('scoring.noShootHits'), sec: 5 },
    { key: 'penalty_procedural_sec' as const, label: t('scoring.procedurals'), sec: 5 },
  ];

  return {
    t,
    sd,
    shooter,
    isReadOnly,
    paperTargets,
    toggleNeutralized,
    handleTimeChange,
    handleResetAll,
    handleDnfToggle,
    handlePenaltyChange,
    preview,
    penalties,
  };
}

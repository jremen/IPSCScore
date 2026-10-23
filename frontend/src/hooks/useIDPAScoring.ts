import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../stores/scoringStore';
import { useScoreDataUpdater } from './useScoreDataUpdater';
import { calculateIDPAPreview } from '../utils/scoring';
import type { ScoreInput, TargetScore } from '../types/scoring';
import type { Stage } from '../types/stage';

export function useIDPAScoring(stage: Stage, score: ScoreInput) {
  const { t } = useTranslation();
  const setScore = useScoringStore((s) => s.setScore);
  const { sd, updateScoreData } = useScoreDataUpdater(score);
  const hpp = stage.hits_per_paper;

  const penalty_pe = sd.penalty_pe || 0;
  const penalty_hnt = sd.penalty_hnt || 0;
  const penalty_ftn = sd.penalty_ftn || 0;
  const penalty_fp = sd.penalty_fp || 0;
  const penalty_ftdr = sd.penalty_ftdr || 0;

  const paperTargets = useMemo(
    () => score.targets.filter((target) => target.target_type === 'paper').sort((a, b) => a.target_index - b.target_index),
    [score.targets],
  );
  const steelTargets = useMemo(
    () => score.targets.filter((target) => target.target_type === 'steel'),
    [score.targets],
  );
  const steelMisses = useMemo(
    () => steelTargets.filter((target) => !target.steel_hit).length,
    [steelTargets],
  );

  const isTargetFinished = useCallback((target: TargetScore) => {
    const totalHits = target.alpha + target.charlie + target.delta + target.miss;
    return totalHits >= hpp;
  }, [hpp]);

  const handlePaperHitClick = useCallback((targetIndex: number, field: 'alpha' | 'charlie' | 'delta') => {
    const newTargets = score.targets.map((target) => {
      if (target.target_type !== 'paper' || target.target_index !== targetIndex) return target;
      const total = target.alpha + target.charlie + target.delta + target.miss;
      if (total < hpp) return { ...target, [field]: target[field] + 1 };
      const stealOrder: Array<'alpha' | 'charlie' | 'delta' | 'miss'> = ['alpha', 'charlie', 'delta', 'miss'];
      for (const stealFrom of stealOrder) {
        if (stealFrom !== field && target[stealFrom] > 0) {
          return { ...target, [stealFrom]: target[stealFrom] - 1, [field]: target[field] + 1 };
        }
      }
      return target;
    });
    setScore({ ...score, targets: newTargets });
  }, [hpp, score, setScore]);

  const handlePaperMissClick = useCallback((targetIndex: number) => {
    const newTargets = score.targets.map((target) => {
      if (target.target_type !== 'paper' || target.target_index !== targetIndex) return target;
      const total = target.alpha + target.charlie + target.delta + target.miss;
      if (total >= hpp) {
        const stealOrder: Array<'alpha' | 'charlie' | 'delta'> = ['alpha', 'charlie', 'delta'];
        for (const stealFrom of stealOrder) {
          if (target[stealFrom] > 0) return { ...target, [stealFrom]: target[stealFrom] - 1, miss: target.miss + 1 };
        }
        return target;
      }
      return { ...target, miss: target.miss + 1 };
    });
    setScore({ ...score, targets: newTargets });
  }, [hpp, score, setScore]);

  const handlePaperDecrement = useCallback((targetIndex: number, field: 'alpha' | 'charlie' | 'delta' | 'miss') => {
    const newTargets = score.targets.map((target) => {
      if (target.target_type !== 'paper' || target.target_index !== targetIndex) return target;
      return { ...target, [field]: Math.max(0, target[field] - 1) };
    });
    setScore({ ...score, targets: newTargets });
  }, [score, setScore]);

  const handlePaperNSClick = useCallback((targetIndex: number, delta: number) => {
    const newTargets = score.targets.map((target) => {
      if (target.target_type !== 'paper' || target.target_index !== targetIndex) return target;
      return { ...target, no_shoot_hits: Math.max(0, target.no_shoot_hits + delta) };
    });
    setScore({ ...score, targets: newTargets });
  }, [score, setScore]);

  const handleResetTarget = useCallback((targetIndex: number) => {
    const newTargets = score.targets.map((target) => {
      if (target.target_type !== 'paper' || target.target_index !== targetIndex) return target;
      return { ...target, alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0 };
    });
    setScore({ ...score, targets: newTargets });
  }, [score, setScore]);

  const handleSteelMissChange = useCallback((newMisses: number) => {
    const clamped = Math.max(0, Math.min(newMisses, steelTargets.length));
    const hits = steelTargets.length - clamped;
    const newTargets = score.targets.map((target) => {
      if (target.target_type !== 'steel') return target;
      const index = target.target_index - stage.paper_targets - 1;
      return { ...target, steel_hit: index < hits };
    });
    setScore({ ...score, targets: newTargets });
  }, [score, setScore, stage.paper_targets, steelTargets.length]);

  const handleTimeChange = useCallback((value: number | null) => {
    const currentScore = useScoringStore.getState().currentScore;
    if (currentScore) setScore({ ...currentScore, time: value });
  }, [setScore]);

  const handleResetAll = useCallback(() => {
    const resetTargets = score.targets.map((target) => ({
      ...target,
      alpha: 0,
      charlie: 0,
      delta: 0,
      miss: 0,
      no_shoot_hits: 0,
      steel_hit: target.target_type === 'steel' ? true : target.steel_hit,
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
      score_data: { penalty_pe: 0, penalty_hnt: 0, penalty_ftn: 0, penalty_fp: 0, penalty_ftdr: 0 },
    });
  }, [score, setScore]);

  const handleDnfToggle = useCallback(() => {
    const currentScore = useScoringStore.getState().currentScore;
    if (currentScore) setScore({ ...currentScore, is_dnf: !currentScore.is_dnf });
  }, [setScore]);

  const handlePenaltyChange = useCallback((key: keyof typeof sd, delta: number) => {
    updateScoreData({ [key]: Math.max(0, ((sd[key] as number) || 0) + delta) });
  }, [sd, updateScoreData]);

  const handlePenaltyIncrement = useCallback((key: 'penalty_pe' | 'penalty_hnt' | 'penalty_ftn' | 'penalty_fp') => {
    updateScoreData({ [key]: ((sd[key] as number) || 0) + 1 });
  }, [sd, updateScoreData]);

  const handleFtdrChange = useCallback((delta: number) => {
    updateScoreData({ penalty_ftdr: Math.max(0, penalty_ftdr + delta) });
  }, [penalty_ftdr, updateScoreData]);

  const preview = calculateIDPAPreview({
    targets: score.targets.map((target) => ({
      ...target,
      hits_per_paper: stage.hits_per_paper,
    })),
    time: score.time || 0,
    penalty_pe,
    penalty_hnt,
    penalty_ftn,
    penalty_fp,
    penalty_ftdr,
  });

  const penalties = [
    { key: 'penalty_pe' as const, label: t('scoring.peProcedural'), sec: 3 },
    { key: 'penalty_hnt' as const, label: t('scoring.hntHitNs'), sec: 5 },
    { key: 'penalty_ftn' as const, label: t('scoring.ftnFailNeutralize'), sec: 5 },
    { key: 'penalty_fp' as const, label: t('scoring.fpFlagrant'), sec: 10 },
  ];

  return {
    hpp,
    sd,
    paperTargets,
    steelTargets,
    steelMisses,
    isTargetFinished,
    handlePaperHitClick,
    handlePaperMissClick,
    handlePaperDecrement,
    handlePaperNSClick,
    handleResetTarget,
    handleSteelMissChange,
    handleTimeChange,
    handleResetAll,
    handleDnfToggle,
    handlePenaltyChange,
    handlePenaltyIncrement,
    handleFtdrChange,
    preview,
    penalties,
    penalty_ftdr,
  };
}

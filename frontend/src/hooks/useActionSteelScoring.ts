import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../stores/scoringStore';
import { useScoreDataUpdater } from './useScoreDataUpdater';
import { useScoringReadOnly } from './useScoringReadOnly';
import { calculateActionSteelPreview } from '../utils/scoring';
import type { ScoreInput } from '../types/scoring';
import type { Stage } from '../types/stage';

export function useActionSteelScoring(stage: Stage, score: ScoreInput) {
  const { t } = useTranslation();
  const setScore = useScoringStore((s) => s.setScore);
  const { sd, updateScoreData } = useScoreDataUpdater(score);
  const shooter = useScoringStore((s) => s.registrations.find((r) => r.id === s.currentRegistrationId));
  const isReadOnly = useScoringReadOnly();

  const config = stage.config || {};
  const numStrings = config.number_of_strings || 5;
  const targetsPerString = config.targets_per_string || 5;
  const dropWorst = config.drop_worst ?? 1;

  const stringTimes: number[] =
    sd.string_times?.length === numStrings ? sd.string_times! : new Array(numStrings).fill(0);
  const stringPlateHits: boolean[][] =
    sd.string_plate_hits?.length === numStrings
      ? sd.string_plate_hits!
      : new Array(numStrings).fill(null).map(() => new Array(targetsPerString).fill(false));

  const handleStringTime = useCallback(
    (stringIndex: number, value: number | null) => {
      const times = [...stringTimes];
      times[stringIndex] = value ?? 0;
      updateScoreData({ string_times: times });
    },
    [stringTimes, updateScoreData],
  );

  const togglePlate = useCallback(
    (stringIndex: number, plateIndex: number) => {
      const hits = stringPlateHits.map((row) => [...row]);
      hits[stringIndex][plateIndex] = !hits[stringIndex][plateIndex];
      updateScoreData({ string_plate_hits: hits });
    },
    [stringPlateHits, updateScoreData],
  );

  const handleResetAll = useCallback(() => {
    setScore({
      ...score,
      time: null,
      targets: [],
      procedural_count: 0,
      ftsa_count: 0,
      extra_shot_count: 0,
      extra_hit_count: 0,
      stacking_count: 0,
      overtime_shot_count: 0,
      is_dnf: false,
      score_data: {
        string_times: new Array(numStrings).fill(0),
        string_plate_hits: new Array(numStrings)
          .fill(null)
          .map(() => new Array(targetsPerString).fill(false)),
      },
    });
  }, [numStrings, score, setScore, targetsPerString]);

  const handleDnfToggle = useCallback(() => {
    setScore({ ...score, is_dnf: !score.is_dnf });
  }, [score, setScore]);

  const preview = calculateActionSteelPreview({
    string_times: stringTimes,
    string_plate_hits: stringPlateHits,
    drop_worst: dropWorst,
    miss_penalty: 3,
    stop_plate_miss_cap: 30,
  });

  return {
    t,
    shooter,
    isReadOnly,
    numStrings,
    targetsPerString,
    dropWorst,
    stringTimes,
    stringPlateHits,
    handleStringTime,
    togglePlate,
    handleResetAll,
    handleDnfToggle,
    preview,
  };
}

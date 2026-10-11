import { useScoringStore } from "../stores/scoringStore";
import { useStageStore } from "../stores/stageStore";

export function useMatchProgress() {
  
    const scoredLength = useScoringStore(
      (s) => {
        const progress = s.scoringProgress?.scored;
        if (!progress || !s.registrations) return 0;
        const nonDqIds = new Set(s.registrations.filter(r => !r.is_dq).map(r => r.id));
        let n = 0;
        for (const e of progress) {
          if (nonDqIds.has(e.registration_id)) n++;
        }
        return n;
      }
    );

    const scored = useScoringStore(
      (s) => s.scoringProgress?.scored
    );
  
    const registrationsLength = useScoringStore(
      (s) => s.registrations?.filter(r => !r.is_dq).length ?? 0
    );
  
    const stagesLength = useStageStore(
      (s) => s.stages?.length ?? 0
    );
  
    const fetchScoringProgress = useScoringStore(
      (s) => s.fetchScoringProgress
    );
  
    const fetchRegistrations = useScoringStore(
      (s) => s.fetchRegistrations
    );
  
    const fetchStages = useStageStore(
      (s) => s.fetchStages
    );

    return {scored, scoredLength, stagesLength, registrationsLength, fetchRegistrations, fetchScoringProgress, fetchStages}
}

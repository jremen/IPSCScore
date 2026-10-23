import type { DqShooter } from '../../stores/resultsStore';
import type { ShooterStageSummariesResponse } from '../../types/results';
import type { ColumnKey } from '../../utils/resultsTable';

export interface ResultsTableProps {
  results: any[];
  scored?: { scored: import('../../types/scoring').ScoringProgressEntry[] | undefined; stagesLength: number };
  columns: ColumnKey[];
  showDqBadge?: boolean;
  onShooterClick?: (registrationId: string) => void;
}

export interface ShooterSummaryViewProps {
  summary: ShooterStageSummariesResponse | null;
  loading: boolean;
  onBack: () => void;
}

export interface StageSummaryCardProps {
  stageData: ShooterStageSummariesResponse['stages'][0];
  powerFactor: import('../../types/shooter').PowerFactor;
}

export interface KioskShellProps {
  children: import('react').ReactNode;
}

export type ResultTab = 'byDivision' | 'overall' | 'byStage' | 'byCategory' | 'byTag';

export interface ResultsOverviewProps {
  isPublic?: true;
  matchOverride?: { organization?: string; firearm_type?: string; name?: string; date?: string } | null;
}

export interface DqTableProps {
  dqShooters: DqShooter[];
  showDivision?: boolean;
}

export interface DivisionContentProps {
  divisionResults: Record<string, any[]>;
  dqDivisions: DqShooter[];
  loading: boolean;
  onShooterClick?: (registrationId: string) => void;
}

export interface OverallContentProps {
  overallResults: any[];
  dqOverall: DqShooter[];
  onShooterClick?: (registrationId: string) => void;
}

export interface StageContentProps {
  stageResults: any[];
  onShooterClick?: (registrationId: string) => void;
}

export interface CategoryContentProps {
  categoryResults: Record<string, any>;
  dqCategories: DqShooter[];
}

export interface TagContentProps {
  tagResults: Record<string, any>;
  dqTags: DqShooter[];
}

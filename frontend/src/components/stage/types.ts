import type { ScoringType, Stage, StageConfig } from '../../types/stage';

export interface StageImageUploadProps {
  stageId: string;
}

export interface PrintScoreSheetButtonProps {
  stages: Stage[];
}

export interface ScoreSheetCountModalProps {
  show: boolean;
  stages: Stage[];
  onClose: () => void;
  onGenerate: () => void;
}

export interface StageCardProps {
  stage: Stage;
  onEdit: (stage: Stage) => void;
  onDelete: (stageId: string) => void;
}

export interface StageForm {
  name: string;
  scoring_type: ScoringType;
  paper_targets: number;
  steel_targets: number;
  no_shoot_targets: number;
  npm_targets: number;
  hits_per_paper: number;
  par_time: number | null;
  config: StageConfig;
  password: string;
  briefing: string;
}

export interface StageFormModalProps {
  show: boolean;
  onClose: () => void;
  editStage?: Stage | null;
  matchId: string;
}

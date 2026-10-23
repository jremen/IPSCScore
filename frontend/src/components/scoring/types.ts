import type { ReactNode } from 'react';
import type { Stage } from '../../types/stage';
import type { ScoreInput, TargetScore } from '../../types/scoring';

export interface ScoringSheetProps {
  stage: Stage;
  score: ScoreInput;
}

export interface ScoringSheetContainerProps extends ScoringSheetProps {
  /** @deprecated Shooter is now read from the store directly in each sheet */
  shooter?: unknown;
}

export interface ScoreSummarySheetProps {
  stage: Stage;
  score: ScoreInput;
  shooterName: string;
  shooterDetails?: { division: string; category: string; powerFactor: string };
  onBack: () => void;
  onApprove: () => void;
}

export type PaperTotalField = 'alpha' | 'charlie' | 'delta' | 'miss' | 'no_shoot_hits';

export interface PaperTotals {
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot_hits: number;
}

export interface DesktopPaperTargetsProps {
  paperTargets: { target_index: number; alpha: number; charlie: number; delta: number; miss: number; no_shoot_hits: number }[];
  hpp: number;
  hasNoShootTargets: boolean;
  paperTotals: PaperTotals;
  onPaperTotalsChange: (field: PaperTotalField, value: number) => void;
  disabled?: boolean;
}

export interface DesktopSteelTargetsProps {
  steelTargets: TargetScore[];
  steelMisses: number;
  onSteelMissChange: (newMisses: number) => void;
  disabled?: boolean;
  steelNSHits?: number;
  onSteelNSChange?: (delta: number) => void;
  npmCount?: number;
  npmHits?: number;
  onNpmHitChange?: (newHits: number) => void;
}

export interface IDPAScorePreviewCardProps {
  raw_points: number;
  total_time: number;
}

export interface MultiGunScoringSheetProps {
  score: ScoreInput;
}

export interface DnfToggleProps {
  isDnf: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export interface ScorePreviewCardData {
  raw_points: number;
  penalty_points: number;
  net_points: number;
  hit_factor: number;
}

export interface ScorePreviewCardProps {
  preview: ScorePreviewCardData;
}

export interface ScoringSheetHeaderProps {
  title?: string;
  subtitle: string;
  onReset?: () => void;
}

export interface SummaryNavigationButtonProps {
  onClick: () => void;
}

export interface PenaltyStepperProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  size?: 'sm' | 'md' | 'lg';
  color?: 'orange' | 'purple' | 'red';
  disabled?: boolean;
}

export interface DqSectionProps {
  shooter: import('../../types/scoring').RegistrationWithShooter | undefined;
  disabled?: boolean;
}

export interface NoShootSectionProps {
  noShootHits: number;
  onNoShootChange: (newHits: number) => void;
  disabled?: boolean;
}

export interface PaperTargetsTableProps {
  paperTargets: TargetScore[];
  hpp: number;
  hasNoShootTargets: boolean;
  isTargetFinished: (target: TargetScore) => boolean;
  onHitClick: (targetIndex: number, field: 'alpha' | 'charlie' | 'delta') => void;
  onMissClick: (targetIndex: number) => void;
  onDecrement: (targetIndex: number, field: 'alpha' | 'charlie' | 'delta' | 'miss') => void;
  onNSClick: (targetIndex: number, delta: number) => void;
  onResetTarget: (targetIndex: number) => void;
  disabled?: boolean;
  steelCount: number;
  steelHits: number;
  steelMisses: number;
  onSteelHitIncrement: () => void;
  onSteelHitDecrement: () => void;
  onSteelMissIncrement: () => void;
  onSteelMissDecrement: () => void;
  onSteelNSClick: (delta: number) => void;
  steelNSHits: number;
  onResetSteel: () => void;
  npmCount: number;
  npmHits: number;
  onNpmHitIncrement: () => void;
  onNpmHitDecrement: () => void;
  onResetNpm: () => void;
}

export interface HitCellProps {
  value: number;
  color: string;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

export interface RescoreConfirmModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  shooterName: string;
  stageName: string;
}

export interface DqConfirmModalProps {
  show: boolean;
  onClose: () => void;
  shooterName: string;
  dqReason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
}

export interface SummarySheetLayoutProps {
  shooterName: string;
  badges?: ReactNode;
  children: ReactNode;
  onBack: () => void;
  onApprove: () => void;
}

export interface ProceduralsSectionProps {
  proceduralCount: number;
  onProceduralChange: (delta: number) => void;
  showExtraPenalties: boolean;
  isVirginia: boolean;
  isFixedTime: boolean;
  extraShotCount: number;
  extraHitCount: number;
  stackingCount: number;
  overtimeShotCount: number;
  onPenaltyFieldChange: (key: 'extra_shot_count' | 'extra_hit_count' | 'stacking_count' | 'overtime_shot_count', delta: number) => void;
  disabled?: boolean;
}

export interface ShooterListScreenProps {
  show: boolean;
  onClose: () => void;
  onSelect: (registrationId: string) => void;
}

export interface StageDetailsViewProps {
  show: boolean;
  onClose: () => void;
  stage: Stage | null;
}

export interface StagePickerModalProps {
  show: boolean;
  onClose: () => void;
}

export interface TimeInputProps {
  regular?: boolean;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  className?: string;
  /** Debounce delay in ms for the onChange callback. Default: 600ms */
  debounceMs?: number;
}

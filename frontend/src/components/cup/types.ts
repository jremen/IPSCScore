import type { CupMatchRef, CupResultRow, CupScoringMode } from '../../types/cup';

export interface MatchPickerProps {
  selected: Set<string>;
  onToggle: (id: string) => void;
  excludeIds?: Set<string>;
}

export interface DeleteCupModalProps {
  show: boolean;
  onClose: () => void;
  cupId: string | null;
}

export interface CreateCupModalProps {
  show: boolean;
  onClose: () => void;
  onCreated?: (cupId: string) => void;
  preselectedMatchIds?: string[];
  preselectOnly?: boolean;
}

export interface CupResultsTableProps {
  rows: CupResultRow[];
  matches: CupMatchRef[];
  mode: CupScoringMode;
  hasDivision: boolean;
}

export interface CupDetailResultsProps {
  results: import('../../types/cup').CupResultsPayload;
  tab: 'byDivision' | 'overall' | 'byCategory' | 'byTag';
  mode: CupScoringMode;
  getLimitedRows: (rows: CupResultRow[]) => CupResultRow[];
}

export interface CupDetailProps {
  cupId: string;
  onBack: () => void;
}

export interface AddCupMatchesModalProps {
  show: boolean;
  onClose: () => void;
  cupId: string;
  existingIds: string[];
}

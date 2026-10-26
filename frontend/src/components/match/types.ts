export type ImportTab = 'json' | 'winmss' | 'psc';

export interface ImportResult {
  matches: Array<{ id: string; name: string; date: string; imported: boolean; updated?: boolean }>;
  stages: Array<{ id: string; name: string; stage_number: number; updated?: boolean }>;
  shooters: { created: number; skipped: number; errors: string[] };
  registrations: { created: number; skipped: number };
  scores: { created: number; skipped?: number; errors: string[] };
  warnings: string[];
}

export interface WinMssInspection {
  format?: 'mdb' | 'cab';
  files?: string[];
  warnings?: string[];
  tables?: Record<string, {
    rowCount: number;
    columns?: string[];
    sampleRows?: unknown[];
    error?: string;
  }>;
}

export interface ImportMatchModalProps {
  show: boolean;
  onClose: () => void;
  onImported: () => void;
}

export interface DeleteMatchModalProps {
  show: boolean;
  onClose: () => void;
  matchId: string | null;
}

export interface CreateMatchModalProps {
  show: boolean;
  onClose: () => void;
}

export interface ExportMatchModalProps {
  show: boolean;
  onClose: () => void;
  matchId: string;
  matchName: string;
}

export interface BulkDeleteMatchesModalProps {
  show: boolean;
  onClose: () => void;
  matchIds: string[];
  matchNames: string[];
  onDeleted: () => void;
}

export interface FileDropzoneProps {
  accept: Record<string, string[]>;
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  icon?: string;
  dropHint: string;
  dragHint: string;
  browseHint: string;
  extraButton?: { label: string; onClick: () => void };
}

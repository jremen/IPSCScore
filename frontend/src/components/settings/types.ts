import type { ReactNode } from 'react';
import type { ThemeMode } from '../../stores/uiStore';

export interface ThemeOption {
  value: ThemeMode;
  icon: ReactNode;
  labelKey: string;
}

export interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
}

export interface AuditLogModalProps {
  show: boolean;
  onClose: () => void;
}

export interface RestorePreview {
  folder: string;
  fullFile: string;
  fullSize: number;
  fullDate: string;
  deltasCount: number;
  deltaDates: { earliest: string | null; latest: string | null };
}

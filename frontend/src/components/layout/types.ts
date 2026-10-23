export type QRCodeModalMode = 'results' | 'scoring' | 'squads';

export interface MatchProgressProps {
  size?: 'xl' | undefined;
  width?: string;
  variant?: 'default' | 'kiosk';
  /**
   * Pre-computed percentage. When provided (e.g. by the public kiosk, which
   * cannot access the protected scoring endpoints) the internal store-based
   * fetching is skipped and this value is displayed as-is.
   */
  progressValue?: number;
}

export interface KioskShellProps {
  children: import('react').ReactNode;
}

export interface QRCodeModalProps {
  show: boolean;
  onClose: () => void;
  mode: QRCodeModalMode;
}

export interface ScorerTrustModalProps {
  show: boolean;
  onClose: () => void;
}

export interface ScorerSession {
  id: string;
  device_label: string | null;
  device_id: string | null;
  approved_at: string | null;
  last_used_at: string;
}

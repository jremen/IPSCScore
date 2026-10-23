import type { RegistrationWithShooter } from '../../types/scoring';
import type { useSelection } from '../../hooks/useSelection';

export interface SquaddingModalProps {
  show: boolean;
  onClose: () => void;
  matchId: string;
  onUpdated?: () => void;
}

export interface RegistrationTableProps {
  registrations: RegistrationWithShooter[];
  totalCount: number;
  selection: ReturnType<typeof useSelection<string>>;
  onEdit: (registration: RegistrationWithShooter) => void;
  onRemove: (registrationId: string) => void;
  onUngroup: (registrationId: string) => void;
  onDragToGroup: (sourceId: string, targetId: string) => void;
  /** Hide division badges for sports that do not use divisions (archery). */
  showDivision?: boolean;
}

export interface GripHandleProps {
  registration: RegistrationWithShooter;
}

export interface RegistrationRowProps {  registration: RegistrationWithShooter;
  index: number;
  selection: RegistrationTableProps['selection'];
  onEdit: RegistrationTableProps['onEdit'];
  onRemove: RegistrationTableProps['onRemove'];
  onUngroup: RegistrationTableProps['onUngroup'];
  showDivision: boolean;
}

export interface AddShooterToSquadModalProps {
  show: boolean;
  onClose: () => void;
  targetSquad: number;
  registrations: RegistrationWithShooter[];
  onAdd: (registrationId: string) => void;
}

export interface SquadColumnProps {
  squadNumber: number;
  shooters: RegistrationWithShooter[];
  onAddShooter: () => void;
  onRemoveFromGroup: (registrationId: string) => void;
  query: string;
}

export interface ShooterCardProps {
  registration: RegistrationWithShooter;
  isDragging?: boolean;
  onRemoveFromGroup?: (registrationId: string) => void;
}

export interface CreateShooterModalProps {
  show: boolean;
  onClose: () => void;
  matchId: string;
  onCreated: () => void;
}

export interface AddShooterModalProps {
  show: boolean;
  onClose: () => void;
  matchId: string;
  registeredShooterIds: string[];
  onAdded: () => void;
  onCreate: () => void;
}

export interface BulkEditRegistrationsModalProps {
  show: boolean;
  onClose: () => void;
  selectedIds: string[];
  matchId: string;
  onSaved: () => void;
}

export interface BulkRemoveRegistrationsModalProps {
  show: boolean;
  onClose: () => void;
  registrationIds: string[];
  registrationNames: string[];
  matchId: string;
  onRemoved: () => void;
}

export interface EditRegistrationModalProps {
  show: boolean;
  onClose: () => void;
  registration: RegistrationWithShooter | null;
  matchId: string;
  onSaved: () => void;
}

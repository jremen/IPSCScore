import type { Shooter } from '../../types/shooter';

export interface BulkDeleteShootersModalProps {
  show: boolean;
  onClose: () => void;
  shooterIds: string[];
  shooterNames: string[];
  onDeleted: () => void;
}

export interface BulkEditShootersModalProps {
  show: boolean;
  onClose: () => void;
  selectedIds: string[];
  onSaved: () => void;
}

export interface DeleteShooterModalProps {
  show: boolean;
  onClose: () => void;
  shooter: Pick<Shooter, 'id' | 'first_name' | 'last_name'> | null;
  onDeleted: () => void;
}

export interface ShooterRowProps {
  shooter: Shooter;
  selected: boolean;
  onToggle: (id: string) => void;
  onEdit: (shooter: Shooter) => void;
  onDelete: (shooter: Shooter) => void;
  onRestore: (id: string) => void;
}

export interface ShooterFormModalProps {
  show: boolean;
  onClose: () => void;
  editShooter?: Shooter | null;
}

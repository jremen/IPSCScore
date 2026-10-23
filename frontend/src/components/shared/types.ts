import type { FocusEvent, KeyboardEvent } from 'react';
import type { Category, Division, PowerFactor } from '../../types/shooter';

export interface CsvImportModalProps {
  show: boolean;
  onClose: () => void;
  type: 'shooters' | 'registrations' | 'scores';
  matchId?: string;
  onImportComplete?: () => void;
}

export interface CsvImportExportProps {
  type: 'shooters' | 'registrations' | 'scores';
  matchId?: string;
  onImportComplete?: () => void;
}

export interface InputFieldProps {
  id?: string;
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  type?: 'text' | 'number';
  step?: string;
  min?: string;
  max?: string;
  unit?: string;
  required?: boolean;
  placeholder?: string;
  sizing?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'failure' | 'warning' | 'success';
  disabled?: boolean;
  className?: string;
  decimal?: boolean;
  numeric?: boolean;
}

export interface SelectAllCheckboxProps {
  allSelected: boolean;
  someSelected: boolean;
  onToggle: () => void;
  selectedCount: number;
  totalCount: number;
}

export interface ShooterFormData {
  first_name: string;
  last_name: string;
  category: Category | string;
  division: Division | string;
  power_factor: PowerFactor | string;
  region: string;
  tag: string | null;
  email: string | null;
}

export interface ShooterFormFieldsProps {
  form: ShooterFormData;
  onChange: (form: ShooterFormData) => void;
  showTagAndEmail?: boolean;
  showSquad?: boolean;
  squad?: string;
  onSquadChange?: (squad: string) => void;
  organization?: string;
  showDivision?: boolean;
  firearmType?: string;
}

export interface BulkActionToolbarProps {
  selectedCount: number;
  onEdit?: () => void;
  onCreate?: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  editLabel?: string;
  createLabel?: string;
  deleteLabel?: string;
  onGroup?: () => void;
  onUngroup?: () => void;
  showGroup?: boolean;
  showUngroup?: boolean;
}

export interface BulkEditForm {
  changeDivision: boolean;
  division: string;
  changeCategory: boolean;
  category: string;
  changePowerFactor: boolean;
  powerFactor: string;
  changeTag?: boolean;
  tag: string;
  changeSquad?: boolean;
  squad: string;
}

export interface BulkEditFormFieldsProps {
  form: BulkEditForm;
  onChange: (form: BulkEditForm) => void;
  showSquad?: boolean;
  showDivision?: boolean;
  organization?: string;
  firearmType?: string;
}

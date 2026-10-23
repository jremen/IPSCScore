import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useMatchStore } from '../stores/matchStore';
import { useUIStore } from '../stores/uiStore';
import { getDivisionsForMatch } from '../utils/constants';
import { seedGroupColors } from '../utils/groupColors';
import { useRegistrationFilter } from './useRegistrationFilter';
import { useSelection } from './useSelection';
import { useTabMenuAction } from './useTabMenuAction';
import type { RegistrationWithShooter } from '../types/scoring';

export function useMatchRegistrationView() {
  const activeMatchId = useUIStore((s) => s.activeMatchId);
  const addToast = useUIStore((s) => s.addToast);
  const { t } = useTranslation();
  const matches = useMatchStore((s) => s.matches);
  const [registrations, setRegistrations] = useState<RegistrationWithShooter[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [editRegistration, setEditRegistration] = useState<RegistrationWithShooter | null>(null);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showBulkRemove, setShowBulkRemove] = useState(false);
  const [showSquadding, setShowSquadding] = useState(false);

  const match = matches.find((candidate) => candidate.id === activeMatchId);
  const divisions = getDivisionsForMatch(match);
  const filters = useRegistrationFilter(registrations);
  const filteredIds = filters.filtered.map((registration) => registration.id);
  const selection = useSelection(filteredIds);

  const loadRegistrations = useCallback(async () => {
    if (!activeMatchId) return;
    setRegistrations(await api.getRegistrations(activeMatchId));
  }, [activeMatchId]);

  useEffect(() => {
    if (activeMatchId) loadRegistrations();
  }, [activeMatchId, loadRegistrations]);

  useEffect(() => {
    seedGroupColors(registrations.map((registration) => registration.group_id));
  }, [registrations]);

  useEffect(() => {
    if (divisions.length === 0 && filters.divisionFilter) {
      filters.setDivisionFilter('');
    }
  }, [divisions.length, filters.divisionFilter, filters.setDivisionFilter]);

  useTabMenuAction('add-registration', () => {
    if (activeMatchId) setShowAdd(true);
  });
  useTabMenuAction('new-registration-shooter', () => {
    if (activeMatchId) setShowInlineCreate(true);
  });

  const handleRemove = useCallback(async (registrationId: string) => {
    if (!activeMatchId) return;
    await api.removeRegistration(activeMatchId, registrationId);
    addToast(t('registration.removed'), 'success');
    loadRegistrations();
  }, [activeMatchId, addToast, loadRegistrations, t]);

  const handleBulkAction = useCallback(() => {
    selection.clearSelection();
    loadRegistrations();
  }, [loadRegistrations, selection]);

  const handleGroupRows = useCallback(async (registrationIds: string[]) => {
    if (!activeMatchId || registrationIds.length < 2) return;
    try {
      await api.createGroup(activeMatchId, registrationIds);
      addToast(t('registration.groupSuccess'), 'success');
      loadRegistrations();
    } catch {
      addToast(t('registration.groupError'), 'error');
    }
  }, [activeMatchId, addToast, loadRegistrations, t]);

  const handleUngroupSelected = useCallback(async () => {
    if (!activeMatchId) return;
    const selectedRegistrations = filters.filtered.filter(
      (registration) => selection.isSelected(registration.id) && registration.group_id,
    );
    if (selectedRegistrations.length === 0) return;
    try {
      for (const registration of selectedRegistrations) {
        await api.ungroupRegistration(activeMatchId, registration.id);
      }
      addToast(t('registration.ungroupSuccess'), 'success');
      loadRegistrations();
    } catch {
      addToast(t('registration.ungroupError'), 'error');
    }
  }, [activeMatchId, addToast, filters.filtered, loadRegistrations, selection, t]);

  const handleUngroupSingle = useCallback(async (registrationId: string) => {
    if (!activeMatchId) return;
    try {
      await api.ungroupRegistration(activeMatchId, registrationId);
      addToast(t('registration.ungroupSuccess'), 'success');
      loadRegistrations();
    } catch {
      addToast(t('registration.ungroupError'), 'error');
    }
  }, [activeMatchId, addToast, loadRegistrations, t]);

  const handleDragToGroup = useCallback(async (sourceId: string, targetId: string) => {
    if (!activeMatchId) return;
    const source = filters.filtered.find((registration) => registration.id === sourceId);
    const target = filters.filtered.find((registration) => registration.id === targetId);
    if (!source || !target) return;

    try {
      if (source.group_id && source.group_id === target.group_id) return;
      if (source.group_id && target.group_id) {
        addToast(t('registration.groupMergeNotSupported'), 'info');
        return;
      }
      if (source.group_id) {
        await api.addToGroup(activeMatchId, source.group_id, [targetId]);
      } else if (target.group_id) {
        await api.addToGroup(activeMatchId, target.group_id, [sourceId]);
      } else {
        await api.createGroup(activeMatchId, [sourceId, targetId]);
      }
      addToast(t('registration.groupSuccess'), 'success');
      loadRegistrations();
    } catch {
      addToast(t('registration.groupError'), 'error');
    }
  }, [activeMatchId, addToast, filters.filtered, loadRegistrations, t]);

  const handleBulkGroup = useCallback(() => {
    if (selection.selectedArray.length < 2) return;
    handleGroupRows(selection.selectedArray);
  }, [handleGroupRows, selection.selectedArray]);

  const selectedHasGroup = filters.filtered.some(
    (registration) => selection.isSelected(registration.id) && registration.group_id,
  );
  const selectedNames = selection.selectedArray.map((id) => {
    const registration = registrations.find((candidate) => candidate.id === id);
    return registration ? `${registration.first_name} ${registration.last_name}` : id;
  });

  return {
    activeMatchId,
    registrations,
    match,
    divisions,
    ...filters,
    selection,
    selectedCount: selection.selectedCount,
    selectedHasGroup,
    selectedNames,
    filteredIds,
    loadRegistrations,
    handleRemove,
    handleBulkAction,
    handleGroupRows,
    handleUngroupSelected,
    handleUngroupSingle,
    handleDragToGroup,
    handleBulkGroup,
    showAdd,
    setShowAdd,
    showInlineCreate,
    setShowInlineCreate,
    editRegistration,
    setEditRegistration,
    showBulkEdit,
    setShowBulkEdit,
    showBulkRemove,
    setShowBulkRemove,
    showSquadding,
    setShowSquadding,
  };
}

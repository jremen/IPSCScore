import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShooterStore } from '../stores/shooterStore';
import { useUIStore } from '../stores/uiStore';
import { useSelection } from './useSelection';
import { useTabMenuAction } from './useTabMenuAction';
import type { Shooter } from '../types/shooter';

export function useShooterDatabaseView() {
  const shooters = useShooterStore((s) => s.shooters);
  const total = useShooterStore((s) => s.total);
  const loading = useShooterStore((s) => s.loading);
  const showDeleted = useShooterStore((s) => s.showDeleted);
  const fetchShooters = useShooterStore((s) => s.fetchShooters);
  const restoreShooter = useShooterStore((s) => s.restoreShooter);
  const toggleShowDeleted = useShooterStore((s) => s.toggleShowDeleted);
  const addToast = useUIStore((s) => s.addToast);
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [editShooter, setEditShooter] = useState<Shooter | null>(null);
  const [search, setSearch] = useState('');
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [shooterToDelete, setShooterToDelete] = useState<Pick<Shooter, 'id' | 'first_name' | 'last_name'> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const shooterIds = shooters.map((shooter) => shooter.id);
  const selection = useSelection(shooterIds);

  useEffect(() => { fetchShooters(); }, [fetchShooters]);

  useTabMenuAction('new-shooter', () => setShowCreate(true));
  useTabMenuAction('toggle-show-deleted', () => toggleShowDeleted());
  useTabMenuAction('focus-search', () => searchRef.current?.focus());

  const handleSearch = useCallback(() => {
    fetchShooters({ search });
  }, [fetchShooters, search]);

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [handleSearch]);

  const handleDeleteClick = useCallback((shooter: Shooter) => {
    setShooterToDelete({
      id: shooter.id,
      first_name: shooter.first_name,
      last_name: shooter.last_name,
    });
  }, []);

  const handleDeleted = useCallback(() => {
    setShooterToDelete(null);
    fetchShooters({ search });
  }, [fetchShooters, search]);

  const handleRestore = useCallback(async (id: string) => {
    try {
      await restoreShooter(id);
      addToast(t('shooters.restored'), 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  }, [addToast, restoreShooter, t]);

  const handleCloseModal = useCallback(() => {
    setShowCreate(false);
    setEditShooter(null);
  }, []);

  const handleBulkDeleted = useCallback(() => {
    selection.clearSelection();
    fetchShooters({ search });
  }, [fetchShooters, search, selection]);

  const handleBulkEdited = useCallback(() => {
    selection.clearSelection();
    fetchShooters({ search });
  }, [fetchShooters, search, selection]);

  const selectedNames = selection.selectedArray.map((id) => {
    const shooter = shooters.find((candidate) => candidate.id === id);
    return shooter ? `${shooter.first_name} ${shooter.last_name}` : id;
  });

  return {
    shooters,
    total,
    loading,
    showDeleted,
    toggleShowDeleted,
    fetchShooters,
    search,
    setSearch,
    searchRef,
    selection,
    selectedNames,
    showCreate,
    setShowCreate,
    editShooter,
    setEditShooter,
    showBulkDelete,
    setShowBulkDelete,
    showBulkEdit,
    setShowBulkEdit,
    shooterToDelete,
    setShooterToDelete,
    handleDeleteClick,
    handleDeleted,
    handleRestore,
    handleCloseModal,
    handleBulkDeleted,
    handleBulkEdited,
  };
}

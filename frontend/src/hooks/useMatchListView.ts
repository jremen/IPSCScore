import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../stores/matchStore';
import { useUIStore } from '../stores/uiStore';
import { useMatchExport } from './useMatchExport';
import { useSelection } from './useSelection';
import { useTabMenuAction } from './useTabMenuAction';
import { filterMatches, toDateInputValue, type MatchListFilters } from '../utils/matchList';
import type { FirearmType, Match, MatchLevel } from '../types/match';

export function useMatchListView() {
  const matches = useMatchStore((s) => s.matches);
  const loading = useMatchStore((s) => s.loading);
  const fetchMatches = useMatchStore((s) => s.fetchMatches);
  const markCurrent = useMatchStore((s) => s.markCurrent);
  const unmarkCurrent = useMatchStore((s) => s.unmarkCurrent);
  const activeMatchId = useUIStore((s) => s.activeMatchId);
  const setActiveMatch = useUIStore((s) => s.setActiveMatch);
  const addToast = useUIStore((s) => s.addToast);
  const { exporting } = useMatchExport();
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showCreateCup, setShowCreateCup] = useState(false);
  const [filters, setFilters] = useState<MatchListFilters>({
    search: '',
    firearmType: '',
    level: '',
    dateFrom: '',
    dateTo: '',
  });
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  useTabMenuAction('new-match', () => setShowCreate(true));
  useTabMenuAction('import-match', () => setShowImport(true));
  useTabMenuAction('focus-search', () => searchRef.current?.focus());

  const filteredMatches = useMemo(() => filterMatches(matches as Match[], filters), [matches, filters]);
  const matchIds = filteredMatches.map((match) => match.id);
  const selection = useSelection(matchIds);

  const selectedNames = selection.selectedArray.map((id) => {
    const match = matches.find((candidate) => candidate.id === id);
    return match ? match.name : id;
  });

  const handleSearchChange = useCallback((search: string) => {
    setFilters((previous) => ({ ...previous, search }));
  }, []);
  const handleFirearmTypeChange = useCallback((firearmType: FirearmType | '') => {
    setFilters((previous) => ({ ...previous, firearmType }));
  }, []);
  const handleLevelChange = useCallback((level: MatchLevel | '') => {
    setFilters((previous) => ({ ...previous, level }));
  }, []);
  const handleDateFromChange = useCallback((dateFrom: string) => {
    setFilters((previous) => ({ ...previous, dateFrom }));
  }, []);
  const handleDateToChange = useCallback((dateTo: string) => {
    setFilters((previous) => ({ ...previous, dateTo }));
  }, []);

  const handleToggleCurrent = useCallback((match: Match) => {
    if (match.is_current) {
      unmarkCurrent();
      addToast(t('matches.unsetAsCurrent'), 'success');
    } else {
      markCurrent(match.id);
      addToast(t('matches.setAsCurrentDone'), 'success');
    }
  }, [addToast, markCurrent, t, unmarkCurrent]);

  const handleCreateCupClose = useCallback(() => {
    setShowCreateCup(false);
    selection.clearSelection();
  }, [selection]);

  const handleBulkDeleted = useCallback(() => {
    selection.clearSelection();
  }, [selection]);

  const handleDateFromPickerChange = useCallback((date: Date | null) => {
    handleDateFromChange(toDateInputValue(date));
  }, [handleDateFromChange]);

  const handleDateToPickerChange = useCallback((date: Date | null) => {
    handleDateToChange(toDateInputValue(date));
  }, [handleDateToChange]);

  return {
    matches,
    loading,
    fetchMatches,
    activeMatchId,
    setActiveMatch,
    exporting,
    filters,
    searchRef,
    filteredMatches,
    selection,
    selectedNames,
    showCreate,
    setShowCreate,
    showImport,
    setShowImport,
    showExport,
    setShowExport,
    deleteTarget,
    setDeleteTarget,
    showBulkDelete,
    setShowBulkDelete,
    showCreateCup,
    setShowCreateCup,
    handleSearchChange,
    handleFirearmTypeChange,
    handleLevelChange,
    handleDateFromPickerChange,
    handleDateToPickerChange,
    handleToggleCurrent,
    handleCreateCupClose,
    handleBulkDeleted,
  };
}

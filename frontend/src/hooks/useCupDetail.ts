import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCupStore } from '../stores/cupStore';
import { useUIStore } from '../stores/uiStore';
import useCupExport, { type CupTab } from './useCupExport';
import { getCupDisplayLimit, limitCupRows } from '../utils/cup';
import type { CupResultRow } from '../types/cup';

export function useCupDetail(cupId: string) {
  const { t } = useTranslation();
  const detail = useCupStore((s) => s.detail);
  const results = useCupStore((s) => s.results);
  const loading = useCupStore((s) => s.loading);
  const fetchCup = useCupStore((s) => s.fetchCup);
  const fetchCupResults = useCupStore((s) => s.fetchCupResults);
  const updateCup = useCupStore((s) => s.updateCup);
  const removeMatch = useCupStore((s) => s.removeMatch);
  const addToast = useUIStore((s) => s.addToast);

  const [tab, setTab] = useState<CupTab>('byDivision');
  const [minInput, setMinInput] = useState('');
  const [savingMin, setSavingMin] = useState(false);
  const [minPartInput, setMinPartInput] = useState('');
  const [savingMinPart, setSavingMinPart] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [savingCats, setSavingCats] = useState(false);
  const [showEditCup, setShowEditCup] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [showAddMatches, setShowAddMatches] = useState(false);
  const [showMinError, setShowMinError] = useState(false);
  const [showMinPartError, setShowMinPartError] = useState(false);
  const [showAllShooters, setShowAllShooters] = useState(true);
  const [limitInput, setLimitInput] = useState('3');

  const displayLimit = getCupDisplayLimit(showAllShooters, limitInput);
  const cupExport = useCupExport(tab, displayLimit);

  useEffect(() => {
    fetchCup(cupId);
    fetchCupResults(cupId);
  }, [cupId, fetchCup, fetchCupResults]);

  useEffect(() => {
    if (!detail) return;
    setMinInput(detail.minimum_matches != null ? String(detail.minimum_matches) : '');
    setMinPartInput(detail.minimum_participants != null ? String(detail.minimum_participants) : '');
    setSelectedCats(detail.selected_categories ?? []);
    setLimitInput(String(detail.minimum_participants ?? 3));
  }, [detail]);

  const mode = results?.scoring_mode ?? detail?.scoring_mode ?? 'points';
  const matchCount = results?.matches?.length ?? detail?.matches.length ?? 0;
  const autoMin = Math.floor(matchCount / 2) + 1;
  const required = results?.minimum_matches ?? detail?.minimum_matches ?? autoMin;
  const requiredParticipants = results?.minimum_participants ?? detail?.minimum_participants;

  const saveMinimum = useCallback(async () => {
    setShowMinError(false);
    const parsed = Number(minInput);
    if (minInput !== '' && (!Number.isInteger(parsed) || parsed < 1)) {
      setShowMinError(true);
      return;
    }
    setSavingMin(true);
    try {
      await updateCup(cupId, { minimum_matches: minInput === '' ? null : parsed });
      addToast(t('cups.updated'), 'success');
    } catch (err: any) {
      addToast(err.message || t('common.unknownError'), 'error');
    } finally {
      setSavingMin(false);
    }
  }, [addToast, cupId, minInput, t, updateCup]);

  const saveMinimumParticipants = useCallback(async () => {
    setShowMinPartError(false);
    const parsed = Number(minPartInput);
    if (minPartInput !== '' && (!Number.isInteger(parsed) || parsed < 1)) {
      setShowMinPartError(true);
      return;
    }
    setSavingMinPart(true);
    try {
      await updateCup(cupId, { minimum_participants: minPartInput === '' ? null : parsed });
      addToast(t('cups.updated'), 'success');
    } catch (err: any) {
      addToast(err.message || t('common.unknownError'), 'error');
    } finally {
      setSavingMinPart(false);
    }
  }, [addToast, cupId, minPartInput, t, updateCup]);

  const toggleCategory = useCallback((value: string) => {
    setSelectedCats((previous) => (
      previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value]
    ));
  }, []);

  const saveCategories = useCallback(async () => {
    setSavingCats(true);
    try {
      await updateCup(cupId, { selected_categories: selectedCats.length > 0 ? selectedCats : null });
      addToast(t('cups.updated'), 'success');
    } catch (err: any) {
      addToast(err.message || t('common.unknownError'), 'error');
    } finally {
      setSavingCats(false);
    }
  }, [addToast, cupId, selectedCats, t, updateCup]);

  const openEditCup = useCallback(() => {
    if (!detail) return;
    setEditName(detail.name);
    setShowEditCup(true);
  }, [detail]);

  const saveEditName = useCallback(async () => {
    if (!editName.trim()) {
      addToast(t('cups.nameRequired'), 'error');
      return;
    }
    setSavingName(true);
    try {
      await updateCup(cupId, { name: editName.trim() });
      addToast(t('cups.updated'), 'success');
      setShowEditCup(false);
    } catch (err: any) {
      addToast(err.message || t('common.unknownError'), 'error');
    } finally {
      setSavingName(false);
    }
  }, [addToast, cupId, editName, t, updateCup]);

  const handleRemoveMatch = useCallback(async (matchId: string) => {
    try {
      await removeMatch(cupId, matchId);
      addToast(t('cups.matchRemoved'), 'success');
    } catch (err: any) {
      addToast(err.message || t('common.unknownError'), 'error');
    }
  }, [addToast, cupId, removeMatch, t]);

  const getLimitedRows = useCallback(
    (rows: CupResultRow[]) => limitCupRows(rows, displayLimit),
    [displayLimit],
  );

  return {
    detail,
    results,
    loading,
    tab,
    setTab,
    minInput,
    setMinInput,
    savingMin,
    minPartInput,
    setMinPartInput,
    savingMinPart,
    selectedCats,
    savingCats,
    showEditCup,
    setShowEditCup,
    editName,
    setEditName,
    savingName,
    showAddMatches,
    setShowAddMatches,
    showMinError,
    showMinPartError,
    showAllShooters,
    setShowAllShooters,
    limitInput,
    setLimitInput,
    mode,
    autoMin,
    required,
    requiredParticipants,
    cupExport,
    saveMinimum,
    saveMinimumParticipants,
    toggleCategory,
    saveCategories,
    openEditCup,
    saveEditName,
    handleRemoveMatch,
    getLimitedRows,
  };
}

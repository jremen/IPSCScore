import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { seedGroupColors } from '../utils/groupColors';
import { generateSquaddingPdf } from '../utils/squaddingPdf';
import { nativeSaveAs, saveBlobToDevice } from '../utils/exportUtils';
import { filterRegistrationsByName } from '../utils/registration';
import { useEscClose } from './useEscClose';
import { useSquadDnd } from './useRegistrationDnd';
import { useSquadding } from './useSquadding';
import type { RegistrationWithShooter } from '../types/scoring';

interface UseSquaddingModalOptions {
  show: boolean;
  matchId: string;
  onClose: () => void;
  onUpdated?: () => void;
}

export function useSquaddingModal({ show, matchId, onClose, onUpdated }: UseSquaddingModalOptions) {
  const { t } = useTranslation();
  const addToast = useUIStore((s) => s.addToast);
  const squadding = useSquadding(show ? matchId : null);
  const [addShooterSquad, setAddShooterSquad] = useState<number | null>(null);

  const {
    registrations,
    columns,
    unassigned,
    moveShooter,
    assignShooterToSquad,
    flushPending,
    refresh,
    query,
    setQuery,
    totalShooterCount,
  } = squadding;

  useEffect(() => {
    seedGroupColors(registrations.map((r) => r.group_id));
  }, [registrations]);

  const dnd = useSquadDnd(moveShooter);

  const handleClose = useCallback(async () => {
    setQuery('');
    await flushPending();
    onUpdated?.();
    onClose();
  }, [flushPending, onClose, onUpdated, setQuery]);
  useEscClose(handleClose);

  const handleAddShooter = useCallback((registrationId: string) => {
    if (addShooterSquad === null) return;
    assignShooterToSquad(registrationId, addShooterSquad);
  }, [addShooterSquad, assignShooterToSquad]);

  const handleRemoveFromGroup = useCallback(async (registrationId: string) => {
    if (!matchId) return;
    await api.ungroupRegistration(matchId, registrationId);
    refresh();
  }, [matchId, refresh]);

  const handleGeneratePdf = useCallback(async () => {
    const orderedSquadNumbers = Object.keys(columns)
      .map(Number)
      .sort((a, b) => a - b);

    const matchInfo = await api.getMatch(matchId);
    const matchName = matchInfo.name || 'Squadding';
    const matchDate = matchInfo.date ? new Date(matchInfo.date).toLocaleDateString() : '';

    const doc = await generateSquaddingPdf({
      matchName,
      matchDate,
      columns,
      orderedSquadNumbers,
    });

    const blob = doc.output('blob');
    const baseName = matchName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const defaultName = `${baseName}_squadding.pdf`;

    const pickedFile = await nativeSaveAs(blob, defaultName, [
      { description: 'PDF', accept: { 'application/pdf': ['.pdf'] } },
    ]);
    if (pickedFile) return;

    const saved = await saveBlobToDevice(blob, defaultName);
    addToast(t(saved ? 'results.pdfExported' : 'results.exportFailed'), saved ? 'success' : 'error');
  }, [addToast, columns, matchId, t]);

  const filteredUnassigned = useMemo(
    () => filterRegistrationsByName(unassigned, query),
    [query, unassigned],
  );

  return {
    ...squadding,
    addShooterSquad,
    setAddShooterSquad,
    filteredUnassigned,
    totalShooterCount,
    activeRegistration: dnd.activeRegistration as RegistrationWithShooter | null,
    sensors: dnd.sensors,
    handleDragStart: dnd.handleDragStart,
    handleDragEnd: dnd.handleDragEnd,
    handleClose,
    handleAddShooter,
    handleRemoveFromGroup,
    handleGeneratePdf,
  };
}

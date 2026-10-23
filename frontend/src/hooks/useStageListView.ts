import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStageStore } from '../stores/stageStore';
import { useUIStore } from '../stores/uiStore';
import { useTabMenuAction } from './useTabMenuAction';
import type { Stage } from '../types/stage';

export function useStageListView() {
  const stages = useStageStore((s) => s.stages);
  const loading = useStageStore((s) => s.loading);
  const error = useStageStore((s) => s.error);
  const fetchStages = useStageStore((s) => s.fetchStages);
  const deleteStage = useStageStore((s) => s.deleteStage);
  const activeMatchId = useUIStore((s) => s.activeMatchId);
  const addToast = useUIStore((s) => s.addToast);
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [editStage, setEditStage] = useState<Stage | null>(null);

  useEffect(() => {
    if (activeMatchId) fetchStages(activeMatchId);
  }, [activeMatchId, fetchStages]);

  useTabMenuAction('new-stage', () => {
    if (activeMatchId) setShowCreate(true);
  });

  const handleDelete = useCallback(async (stageId: string) => {
    if (!activeMatchId) return;
    await deleteStage(stageId);
    addToast(t('stages.deleted'), 'success');
  }, [activeMatchId, addToast, deleteStage, t]);

  const handleCloseModal = useCallback(() => {
    setShowCreate(false);
    setEditStage(null);
  }, []);

  return {
    stages,
    loading,
    error,
    activeMatchId,
    showCreate,
    setShowCreate,
    editStage,
    setEditStage,
    handleDelete,
    handleCloseModal,
  };
}

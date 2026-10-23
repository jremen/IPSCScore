import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStageStore } from '../stores/stageStore';
import { useMatchStore } from '../stores/matchStore';
import { useUIStore } from '../stores/uiStore';
import { ISSF_COURSE_TYPES } from '../utils/constants';
import { useEscClose } from './useEscClose';
import { emptyStageForm, getVisibleStageFields } from '../utils/stageForm';
import type { StageForm } from '../components/stage/types';
import type { ScoringType, Stage, StageConfig } from '../types/stage';

interface Options {
  show: boolean;
  onClose: () => void;
  editStage?: Stage | null;
  matchId: string;
}

export function useStageFormModal({ show, onClose, editStage, matchId }: Options) {
  const createStage = useStageStore((s) => s.createStage);
  const updateStage = useStageStore((s) => s.updateStage);
  const addToast = useUIStore((s) => s.addToast);
  const matches = useMatchStore((s) => s.matches);
  const { t } = useTranslation();
  const [form, setForm] = useState<StageForm>(emptyStageForm);
  const matchFirearmType = matches.find((match) => match.id === matchId)?.firearm_type;

  useEscClose(onClose);

  useEffect(() => {
    if (editStage) {
      setForm({
        name: editStage.name,
        scoring_type: editStage.scoring_type,
        paper_targets: editStage.paper_targets,
        steel_targets: editStage.steel_targets,
        no_shoot_targets: editStage.no_shoot_targets,
        npm_targets: editStage.npm_targets ?? 0,
        hits_per_paper: editStage.hits_per_paper,
        par_time: editStage.par_time,
        config: editStage.config || {},
        briefing: editStage.briefing ?? '',
        password: '',
      });
    } else {
      setForm(emptyStageForm());
    }
  }, [editStage, show]);

  const updateField = useCallback(<K extends keyof StageForm>(key: K, value: StageForm[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  }, []);

  const updateConfig = useCallback((updates: StageConfig) => {
    setForm((previous) => ({ ...previous, config: { ...previous.config, ...updates } }));
  }, []);

  const handleScoringTypeChange = useCallback((scoringType: ScoringType) => {
    setForm((previous) => ({ ...previous, scoring_type: scoringType, config: {} }));
  }, []);

  const handleNoShootChange = useCallback((checked: boolean) => {
    setForm((previous) => ({ ...previous, no_shoot_targets: checked ? 1 : 0 }));
  }, []);

  const handleCourseTypeChange = useCallback((courseType: string) => {
    const course = ISSF_COURSE_TYPES.find((candidate) => candidate.value === courseType);
    setForm((previous) => ({
      ...previous,
      config: { ...previous.config, course_type: courseType, shots_per_course: course?.shots || 60 },
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!matchId || !form.name) return;
    if (editStage) {
      try {
        await updateStage(editStage.id, form);
        addToast(t('stages.updated'), 'success');
        onClose();
        setForm(emptyStageForm());
      } catch (err: any) {
        addToast(err.message, 'error');
      }
      return;
    }
    await createStage(matchId, form);
    onClose();
    setForm(emptyStageForm());
  }, [addToast, createStage, editStage, form, matchId, onClose, t, updateStage]);

  const visibleFields = getVisibleStageFields(form.scoring_type);
  const isEdit = Boolean(editStage);
  const title = isEdit
    ? t('stages.editTitle', { number: editStage?.stage_number })
    : t('stages.addTitle');
  const submitLabel = isEdit ? t('stages.saveChanges') : t('stages.addTitle');

  return {
    form,
    matchFirearmType,
    visibleFields,
    title,
    submitLabel,
    updateField,
    updateConfig,
    handleScoringTypeChange,
    handleNoShootChange,
    handleCourseTypeChange,
    handleSubmit,
  };
}

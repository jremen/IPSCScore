import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShooterStore } from '../stores/shooterStore';
import { useUIStore } from '../stores/uiStore';
import { useEscClose } from './useEscClose';
import type { ShooterFormData } from '../components/shared/ShooterFormFields';
import type { CreateShooterInput, Shooter } from '../types/shooter';

const EMPTY_FORM: ShooterFormData = {
  first_name: '', last_name: '', category: 'regular', tag: null,
  division: 'standard', power_factor: 'minor', region: 'SVK', email: null,
};

export function useShooterFormModal({ show, onClose, editShooter }: {
  show: boolean;
  onClose: () => void;
  editShooter?: Shooter | null;
}) {
  const createShooter = useShooterStore((s) => s.createShooter);
  const updateShooter = useShooterStore((s) => s.updateShooter);
  const addToast = useUIStore((s) => s.addToast);
  const { t } = useTranslation();
  const [form, setForm] = useState<ShooterFormData>(EMPTY_FORM);
  useEscClose(onClose);

  useEffect(() => {
    if (editShooter) {
      setForm({
        first_name: editShooter.first_name,
        last_name: editShooter.last_name,
        category: editShooter.category,
        tag: editShooter.tag,
        division: editShooter.division,
        power_factor: editShooter.power_factor,
        region: editShooter.region,
        email: editShooter.email,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editShooter, show]);

  const handleSubmit = useCallback(async () => {
    if (!form.first_name || !form.last_name || !form.region) return;
    if (editShooter) {
      await updateShooter(editShooter.id, form as CreateShooterInput);
      addToast(t('shooters.updated'), 'success');
    } else {
      await createShooter(form as CreateShooterInput);
      addToast(t('shooters.created'), 'success');
    }
    onClose();
  }, [addToast, createShooter, editShooter, form, onClose, t, updateShooter]);

  return {
    form,
    setForm,
    isEdit: Boolean(editShooter),
    title: editShooter ? t('shooters.editTitle') : t('shooters.createTitle'),
    handleSubmit,
  };
}

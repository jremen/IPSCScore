import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import ShooterFormFields from '../shared/ShooterFormFields';
import { useShooterFormModal } from '../../hooks/useShooterFormModal';
import type { ShooterFormModalProps } from './types';

export default function ShooterFormModal({ show, onClose, editShooter }: ShooterFormModalProps) {
  const { t } = useTranslation();
  const { form, setForm, isEdit, title, handleSubmit } = useShooterFormModal({ show, onClose, editShooter });

  return (
    <Modal show={show} onClose={onClose} size="xl">
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        <ShooterFormFields form={form} onChange={setForm} />
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          color="blue"
          onClick={handleSubmit}
          disabled={!form.first_name || !form.last_name || !form.region}
        >
          {isEdit ? t('common.saveChanges') : t('shooters.createTitle')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

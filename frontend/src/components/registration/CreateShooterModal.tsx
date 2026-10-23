import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import ShooterFormFields from '../shared/ShooterFormFields';
import { useCreateShooterModal } from '../../hooks/useCreateShooterModal';
import type { CreateShooterModalProps } from './types';

export default function CreateShooterModal({ show, onClose, matchId, onCreated }: CreateShooterModalProps) {
  const { t } = useTranslation();
  const {
    form,
    setForm,
    squad,
    setSquad,
    divisions,
    matchOrganization,
    matchFirearmType,
    handleCreate,
  } = useCreateShooterModal({ show, matchId, onClose, onCreated });

  return (
    <Modal show={show} onClose={onClose} size="lg">
      <ModalHeader>{t('registration.createTitle')}</ModalHeader>
      <ModalBody>
        <ShooterFormFields form={form} onChange={setForm} showSquad squad={squad} onSquadChange={setSquad} showDivision={divisions.length > 0} organization={matchOrganization} firearmType={matchFirearmType} />
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button color="blue" onClick={handleCreate} disabled={!form.first_name || !form.last_name || !form.region}>
          {t('registration.createAndRegister')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

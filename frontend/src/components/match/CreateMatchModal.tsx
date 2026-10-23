import { Modal, ModalHeader, ModalBody, ModalFooter, Button, TextInput, Select, Label, Datepicker } from 'flowbite-react';
import { ORGANIZATIONS, FIREARM_TYPES, MATCH_LEVELS } from '../../utils/constants';
import { useCreateMatchModal } from '../../hooks/useCreateMatchModal';
import type { FirearmType, MatchLevel, Organization } from '../../types/match';
import type { CreateMatchModalProps } from './types';

export default function CreateMatchModal({ show, onClose }: CreateMatchModalProps) {
  const {
    t,
    form,
    handleCreate,
    handleClose,
    setName,
    setDate,
    setOrganization,
    setFirearmType,
    setMatchLevel,
  } = useCreateMatchModal(onClose);

  return (
    <Modal show={show} onClose={handleClose} size="lg">
      <ModalHeader>{t('matches.createTitle')}</ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-4">
          <div>
            <Label>{t('matches.name')}</Label>
            <TextInput value={form.name} onChange={(event) => setName(event.target.value)} placeholder={t('matches.namePlaceholder')} />
          </div>
          <div>
            <Label>{t('matches.date')}</Label>
            <Datepicker
              value={form.date ? new Date(form.date) : null}
              onChange={setDate}
              placeholder={t('matches.date')}
            />
          </div>
          <div>
            <Label>{t('matches.organization')}</Label>
            <Select value={form.organization} onChange={(event) => setOrganization(event.target.value as Organization)}>
              {ORGANIZATIONS.map((option) => <option key={option.value} value={option.value}>{t(option.i18nKey)}</option>)}
            </Select>
          </div>
          <div>
            <Label>{t('matches.firearm')}</Label>
            <Select value={form.firearm_type} onChange={(event) => setFirearmType(event.target.value as FirearmType)}>
              {FIREARM_TYPES.map((option) => <option key={option.value} value={option.value}>{t(option.i18nKey)}</option>)}
            </Select>
          </div>
          <div>
            <Label>{t('matches.level')}</Label>
            <Select
              value={String(form.match_level)}
              onChange={(event) => setMatchLevel(event.target.value === '' ? '' : (Number(event.target.value) as MatchLevel))}
            >
              <option value="">—</option>
              {MATCH_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
            </Select>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={handleClose}>{t('common.cancel')}</Button>
        <Button color="blue" onClick={handleCreate} disabled={!form.name || !form.date}>{t('common.create')}</Button>
      </ModalFooter>
    </Modal>
  );
}

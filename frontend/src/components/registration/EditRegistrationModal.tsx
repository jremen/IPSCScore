import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Select, Label } from 'flowbite-react';
import { InputField } from '../shared/InputField';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, POWER_FACTORS } from '../../utils/constants';
import { useEditRegistrationModal } from '../../hooks/useEditRegistrationModal';
import type { EditRegistrationModalProps } from './types';

export default function EditRegistrationModal({ show, onClose, registration, matchId, onSaved }: EditRegistrationModalProps) {
  const { t } = useTranslation();
  const { form, setForm, divisions, handleSave } = useEditRegistrationModal({
    matchId,
    registration,
    onClose,
    onSaved,
  });

  return (
    <Modal show={show} onClose={onClose} size="xl">
      <ModalHeader>{t('registration.editTitle', { name: registration ? `${registration.first_name} ${registration.last_name}` : '' })}</ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-3">
          <div>
            <Label>{t('registration.squad')}</Label>
            <InputField type="number" step="1" min="0" value={form.squad} onChange={(value) => setForm({ ...form, squad: value })} placeholder={t('registration.leaveBlankDefault')} />
          </div>
          {divisions.length > 0 && (
            <div>
              <Label>{t('registration.divisionOverride')}</Label>
              <Select value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })}>
                <option value="">{t('registration.defaultOption')}</option>
                {divisions.map((division) => <option key={division.value} value={division.value}>{division.label}</option>)}
              </Select>
            </div>
          )}
          <div>
            <Label>{t('registration.categoryOverride')}</Label>
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">{t('registration.defaultOption')}</option>
              {CATEGORIES.map((category) => <option key={category.value} value={category.value}>{t(category.i18nKey)}</option>)}
            </Select>
          </div>
          <div>
            <Label>{t('registration.powerFactorOverride')}</Label>
            <Select value={form.power_factor} onChange={(e) => setForm({ ...form, power_factor: e.target.value })}>
              <option value="">{t('registration.defaultOption')}</option>
              {POWER_FACTORS.map((powerFactor) => <option key={powerFactor.value} value={powerFactor.value}>{t(powerFactor.i18nKey)}</option>)}
            </Select>
          </div>
          <div>
            <Label>{t('registration.tag')}</Label>
            <InputField value={form.tag} onChange={(value) => setForm({ ...form, tag: value })} placeholder={t('registration.tagPlaceholder')} />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button color="blue" onClick={handleSave}>{t('common.saveChanges')}</Button>
      </ModalFooter>
    </Modal>
  );
}

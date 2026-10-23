import { Modal, ModalHeader, ModalBody, ModalFooter, Button, TextInput, Label, Badge, Spinner } from 'flowbite-react';
import { InputField } from '../shared/InputField';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../stores/matchStore';
import { divisionLabel, getDivisionsForMatch, resolveDivisionForMatch } from '../../utils/constants';
import { useAddShooterModal } from '../../hooks/useAddShooterModal';
import type { AddShooterModalProps } from './types';

export default function AddShooterModal({ show, onClose, matchId, registeredShooterIds, onAdded, onCreate }: AddShooterModalProps) {
  const matches = useMatchStore((s) => s.matches);
  const { t } = useTranslation();
  const match = matches.find((candidate) => candidate.id === matchId);
  const divisionApplies = getDivisionsForMatch(match).length > 0;
  const {
    squad,
    setSquad,
    shooters,
    loading,
    search,
    setSearch,
    handleAdd,
    handleClose,
  } = useAddShooterModal({ matchId, registeredShooterIds, onAdded, onClose });

  return (
    <Modal show={show} onClose={handleClose} size="2xl">
      <ModalHeader>{t('registration.addTitle')}</ModalHeader>
      <ModalBody>
        <div className="mb-3">
          <Label>{t('registration.squadOptional')}</Label>
          <InputField type="number" step="1" min="0" value={squad} onChange={setSquad} placeholder={t('registration.squadPlaceholder')} />
        </div>
        <div className="flex gap-2">
          <TextInput autoFocus placeholder={t('registration.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3 flex-1" />
          <Button color="green" onClick={onCreate}>{t('shooters.newShooter')}</Button>
        </div>
        <div className="max-h-80 overflow-y-auto space-y-1">
          {loading && <div className="text-center py-4"><Spinner size="sm" /> {t('common.loading')}</div>}
          {!loading && shooters.map((shooter) => (
            <div key={shooter.id} className="w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between">
              <span className="dark:text-white">{shooter.first_name} {shooter.last_name}</span>
              <div className="flex items-center gap-1">
                {divisionApplies && (
                  <Badge size="xs" color="blue">
                    {divisionLabel(resolveDivisionForMatch(match, shooter.division) || shooter.division)}
                  </Badge>
                )}
                <Badge size="xs" color="gray">{shooter.region}</Badge>
                <Button size="xs" className="ml-2" onClick={() => handleAdd(shooter.id)}>+&nbsp;{t('common.add')}</Button>
              </div>
            </div>
          ))}
          {!loading && shooters.length === 0 && <p className="text-gray-500 text-sm text-center py-2">{t('registration.searchEmpty')}</p>}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={handleClose}>{t('common.close')}</Button>
      </ModalFooter>
    </Modal>
  );
}

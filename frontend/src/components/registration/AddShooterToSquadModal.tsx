import { Button, Modal, ModalHeader, ModalBody, TextInput, Badge, ModalFooter } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useAddShooterToSquadModal } from '../../hooks/useAddShooterToSquadModal';
import type { AddShooterToSquadModalProps } from './types';

export default function AddShooterToSquadModal({ show, onClose, targetSquad, registrations, onAdd }: AddShooterToSquadModalProps) {
  const { t } = useTranslation();
  const { query, setQuery, filtered, handleClose, handleAdd } = useAddShooterToSquadModal({
    targetSquad,
    registrations,
    onAdd,
    onClose,
  });

  return (
    <Modal show={show} onClose={handleClose} size="lg">
      <ModalHeader>{t('squadding.addShooterTitle', { number: targetSquad })}</ModalHeader>
      <ModalBody>
        <TextInput
          placeholder={t('squadding.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-4"
        />
        <div className="max-h-100 overflow-y-auto space-y-1">
          {filtered.length > 0 ? (
            filtered.map((registration) => (
              <Button
                key={registration.id}
                size="xs"
                color="light"
                onClick={() => handleAdd(registration.id)}
                className="w-full text-left justify-start"
              >
                <div className="font-medium text-sm dark:text-white">
                  {registration.first_name} {registration.last_name}
                </div>
                <div className="flex ml-auto gap-1 mt-0.5">
                  {registration.squad !== null && registration.squad !== undefined && (
                    <Badge color="purple" size="xs">{t('squadding.squadN', { number: registration.squad })}</Badge>
                  )}
                </div>
              </Button>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">{t('squadding.searchEmpty')}</p>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={handleClose}>{t('common.close')}</Button>
      </ModalFooter>
    </Modal>
  );
}

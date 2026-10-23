import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Alert, Spinner } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useDeleteShooterModal } from '../../hooks/useDeleteShooterModal';
import type { DeleteShooterModalProps } from './types';

export default function DeleteShooterModal({ show, onClose, shooter, onDeleted }: DeleteShooterModalProps) {
  const { t } = useTranslation();
  const { loading, matches, matchesLoading, shooterName, handleDelete } = useDeleteShooterModal({
    show,
    onClose,
    shooter,
    onDeleted,
  });

  if (!shooter) return null;

  return (
    <Modal show={show} onClose={onClose} size="md">
      <ModalHeader>{t('shooters.deleteTitle')}</ModalHeader>
      <ModalBody>
        <div className="space-y-3 dark:text-white">
          <p>{t('shooters.deleteConfirm', { name: shooterName })}</p>

          {matchesLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Spinner size="sm" />
              {t('common.loading')}
            </div>
          ) : matches.length > 0 ? (
            <Alert color="warning">
              <p className="font-medium mb-1">
                {t('shooters.deleteRegisteredWarning', { name: shooterName, count: matches.length })}
              </p>
              <ul className="text-sm list-disc pl-4 mt-1">
                {matches.slice(0, 5).map((match) => (
                  <li key={match.match_id}>
                    {match.match_name}
                    {match.date ? t('common.parenthesisedDate', { date: new Date(match.date).toLocaleDateString() }) : ''}
                  </li>
                ))}
                {matches.length > 5 && (
                  <li className="italic">{t('bulkDelete.andMore', { count: matches.length - 5 })}</li>
                )}
              </ul>
            </Alert>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('shooters.deleteNoMatches')}</p>
          )}

          <p className="text-sm text-red-600 dark:text-red-400">{t('bulkDelete.cannotBeUndone')}</p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button color="red" onClick={handleDelete} disabled={loading}>
          {loading ? t('common.loading') : t('shooters.deleteTitle')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

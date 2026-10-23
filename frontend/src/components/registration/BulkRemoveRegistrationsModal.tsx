import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useBulkRemoveRegistrationsModal } from '../../hooks/useBulkRemoveRegistrationsModal';
import type { BulkRemoveRegistrationsModalProps } from './types';

export default function BulkRemoveRegistrationsModal({ show, onClose, registrationIds, registrationNames, matchId, onRemoved }: BulkRemoveRegistrationsModalProps) {
  const { t } = useTranslation();
  const { loading, result, handleRemove, handleClose } = useBulkRemoveRegistrationsModal({
    matchId,
    registrationIds,
    registrationNames,
    onClose,
    onRemoved,
  });

  return (
    <Modal show={show} onClose={handleClose} size="md">
      <ModalHeader>{t('bulkRemove.title')}</ModalHeader>
      <ModalBody>
        {result ? (
          <div className="space-y-3">
            {result.removed > 0 && (
              <Alert color="success">
                {t('bulkRemove.success', { count: result.removed })}
              </Alert>
            )}
            {result.failed.length > 0 && (
              <Alert color="warning">
                <p className="font-medium mb-1">{t('bulkRemove.partialSuccess', { removed: result.removed, failed: result.failed.length })}</p>
                <ul className="text-sm list-disc pl-4">
                  {result.failed.map((failure, index) => (
                    <li key={index}>{failure.name || failure.id}: {failure.reason}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p>{t('bulkRemove.confirm', { count: registrationIds.length })}</p>
            <div className="max-h-40 overflow-y-auto text-sm text-gray-600 dark:text-gray-400 border rounded p-2">
              {registrationNames.slice(0, 10).map((name, index) => (
                <div key={index}>{name}</div>
              ))}
              {registrationNames.length > 10 && (
                <div className="italic">...{t('bulkDelete.andMore', { count: registrationNames.length - 10 })}</div>
              )}
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">{t('bulkRemove.cannotBeUndone')}</p>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {result ? (
          <Button color="gray" onClick={handleClose}>{t('common.close')}</Button>
        ) : (
          <>
            <Button color="failure" onClick={handleRemove} disabled={loading}>
              {loading ? t('common.loading') : t('bulkRemove.title')}
            </Button>
            <Button color="gray" onClick={handleClose}>{t('common.cancel')}</Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}

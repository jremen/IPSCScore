import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Alert } from 'flowbite-react';
import { TbTrash } from 'react-icons/tb';
import { useBulkDeleteMatchesModal } from '../../hooks/useBulkDeleteMatchesModal';
import type { BulkDeleteMatchesModalProps } from './types';

export default function BulkDeleteMatchesModal({ show, onClose, matchIds, matchNames, onDeleted }: BulkDeleteMatchesModalProps) {
  const { t, loading, result, execute, handleClose } = useBulkDeleteMatchesModal({
    onClose,
    matchIds,
    onDeleted,
  });

  return (
    <Modal show={show} onClose={handleClose} size="md">
      <ModalHeader>{t('matches.bulkDeleteTitle')}</ModalHeader>
      <ModalBody>
        {result ? (
          <div className="space-y-3">
            {result.deleted > 0 && (
              <Alert color="success">
                {t('matches.bulkDeleteSuccess', { count: result.deleted })}
              </Alert>
            )}
            {result.failed.length > 0 && (
              <Alert color="warning">
                <p className="font-medium mb-1">{t('matches.bulkDeletePartialSuccess', { deleted: result.deleted, failed: result.failed.length })}</p>
                <ul className="text-sm list-disc pl-4">
                  {result.failed.map((failure, index) => (
                    <li key={index}>{failure.name || failure.id}: {failure.reason}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-3 dark:text-white">
            <p>
              {t('matches.bulkDeleteConfirm', { count: matchIds.length })}
            </p>
            <div className="max-h-40 overflow-y-auto text-sm text-gray-600 dark:text-gray-400 border rounded p-2">
              {matchNames.slice(0, 10).map((name, index) => (
                <div key={index}>{name}</div>
              ))}
              {matchNames.length > 10 && (
                <div className="italic">...{t('matches.bulkDeleteAndMore', { count: matchNames.length - 10 })}</div>
              )}
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">{t('matches.bulkDeleteCannotBeUndone')}</p>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {result ? (
          <Button color="gray" onClick={handleClose}>{t('common.close')}</Button>
        ) : (
          <>
            <Button color="red" onClick={execute} disabled={loading}>
              <TbTrash className="size-4 mr-2" />
              {loading ? t('common.loading') : t('matches.bulkDeleteTitle')}
            </Button>
            <Button color="gray" onClick={handleClose}>{t('common.cancel')}</Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}

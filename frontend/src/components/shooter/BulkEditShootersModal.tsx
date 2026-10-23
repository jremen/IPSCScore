import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import BulkEditFormFields from '../shared/BulkEditFormFields';
import { useBulkEditShootersModal } from '../../hooks/useBulkEditShootersModal';
import type { BulkEditShootersModalProps } from './types';

export default function BulkEditShootersModal({ show, onClose, selectedIds, onSaved }: BulkEditShootersModalProps) {
  const { t } = useTranslation();
  const {
    form,
    setForm,
    hasChanges,
    loading,
    result,
    handleSave,
    handleClose,
  } = useBulkEditShootersModal({ selectedIds, onClose, onSaved });

  return (
    <Modal show={show} onClose={handleClose} size="lg">
      <ModalHeader>{t('bulkEdit.title', { count: selectedIds.length, entity: t('bulkEdit.shooters') })}</ModalHeader>
      <ModalBody>
        {result ? (
          <div className="space-y-3">
            {result.updated > 0 && (
              <Alert color="success">
                {t('bulkEdit.success', { count: result.updated, entity: t('bulkEdit.shooters') })}
              </Alert>
            )}
            {result.failed.length > 0 && (
              <Alert color="warning">
                <p className="font-medium mb-1">{t('bulkEdit.partialSuccess', { updated: result.updated, failed: result.failed.length })}</p>
                <ul className="text-sm list-disc pl-4">
                  {result.failed.map((failure, index) => (
                    <li key={index}>{failure.id}: {failure.reason}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('bulkEdit.selectFields')}</p>
            <BulkEditFormFields form={form} onChange={setForm} />
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {result ? (
          <Button color="gray" onClick={handleClose}>{t('common.close')}</Button>
        ) : (
          <>
            <Button color="gray" onClick={handleClose}>{t('common.cancel')}</Button>
            <Button color="blue" onClick={handleSave} disabled={loading || !hasChanges}>
              {loading ? t('common.loading') : t('bulkEdit.applyChanges')}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}

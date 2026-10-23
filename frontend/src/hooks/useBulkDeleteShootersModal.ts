import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useBulkAction } from './useBulkAction';
import { useEscClose } from './useEscClose';

interface Options {
  shooterIds: string[];
  shooterNames: string[];
  onClose: () => void;
  onDeleted: () => void;
}

export function useBulkDeleteShootersModal({ shooterIds, shooterNames, onClose, onDeleted }: Options) {
  const { t } = useTranslation();
  const bulk = useBulkAction({
    operation: () => api.bulkDeleteShooters(shooterIds),
    errorResult: (error: any) => ({
      deleted: 0,
      failed: [{ id: '', name: '', reason: error?.message || t('common.unknownError') }],
    }),
    onSuccess: onDeleted,
    onClose,
  });

  const handleClose = useCallback(() => {
    bulk.reset();
    onClose();
  }, [bulk, onClose]);
  useEscClose(handleClose);

  return {
    shooterNames,
    loading: bulk.loading,
    result: bulk.result,
    handleDelete: bulk.execute,
    handleClose,
  };
}

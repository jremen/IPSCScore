import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useBulkAction } from './useBulkAction';
import { useEscClose } from './useEscClose';

interface Options {
  matchId: string;
  registrationIds: string[];
  registrationNames: string[];
  onClose: () => void;
  onRemoved: () => void;
}

export function useBulkRemoveRegistrationsModal({
  matchId,
  registrationIds,
  registrationNames,
  onClose,
  onRemoved,
}: Options) {
  const { t } = useTranslation();
  const bulk = useBulkAction({
    operation: () => api.bulkRemoveRegistrations(matchId, registrationIds),
    errorResult: (error: any) => ({
      removed: 0,
      failed: [{ id: '', name: '', reason: error?.message || t('common.unknownError') }],
    }),
    onSuccess: onRemoved,
    onClose,
  });

  const handleClose = useCallback(() => {
    bulk.reset();
    onClose();
  }, [bulk, onClose]);
  useEscClose(handleClose);

  return {
    registrationNames,
    loading: bulk.loading,
    result: bulk.result,
    handleRemove: bulk.execute,
    handleClose,
  };
}

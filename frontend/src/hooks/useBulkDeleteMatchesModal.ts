import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../stores/matchStore';
import { useEscClose } from './useEscClose';
import { useBulkAction } from './useBulkAction';
import type { BulkDeleteMatchesModalProps } from '../components/match/types';

type BulkDeleteResult = {
  deleted: number;
  failed: Array<{ id: string; name: string; reason: string }>;
};

export function useBulkDeleteMatchesModal({
  onClose,
  matchIds,
  onDeleted,
}: Pick<BulkDeleteMatchesModalProps, 'onClose' | 'matchIds' | 'onDeleted'>) {
  const { t } = useTranslation();
  const bulkDeleteMatches = useMatchStore((s) => s.bulkDeleteMatches);

  const operation = useCallback(async (): Promise<BulkDeleteResult> => {
    return bulkDeleteMatches(matchIds);
  }, [bulkDeleteMatches, matchIds]);

  const errorResult = useCallback(
    (error: any): BulkDeleteResult => ({
      deleted: 0,
      failed: [{ id: '', name: '', reason: error?.message || t('common.unknownError') }],
    }),
    [t],
  );

  const { loading, result, execute, reset } = useBulkAction<BulkDeleteResult>({
    operation,
    errorResult,
    onClose,
    onSuccess: onDeleted,
  });

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  useEscClose(handleClose);

  return { t, loading, result, execute, handleClose };
}

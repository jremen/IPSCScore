import { useCallback } from 'react';
import { useMutationState } from './useMutationState';

export interface BulkFailure {
  id: string;
  name?: string;
  reason: string;
}

export interface BulkActionResult {
  failed: BulkFailure[];
}

interface UseBulkActionOptions<TResult extends BulkActionResult> {
  operation: () => Promise<TResult>;
  errorResult: (error: unknown) => TResult;
  onClose: () => void;
  onSuccess?: (result: TResult) => void;
  /** Delay before closing after a fully successful operation. */
  closeDelayMs?: number;
  enabled?: boolean;
}

/**
 * Shared mutate-and-report workflow used by bulk delete/remove/edit modals.
 * Keeps the modal component free of loading/result/try/catch/finally plumbing.
 */
export function useBulkAction<TResult extends BulkActionResult>({
  operation,
  errorResult,
  onClose,
  onSuccess,
  closeDelayMs = 1500,
  enabled = true,
}: UseBulkActionOptions<TResult>) {
  const mutation = useMutationState<TResult>();

  const execute = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await mutation.run(operation);
      if (result.failed.length === 0) {
        onSuccess?.(result);
        setTimeout(onClose, closeDelayMs);
      }
    } catch (err) {
      mutation.setResult(errorResult(err));
    }
  }, [closeDelayMs, enabled, errorResult, mutation, onClose, onSuccess, operation]);

  const reset = useCallback(() => {
    mutation.reset();
  }, [mutation]);

  return {
    loading: mutation.loading,
    result: mutation.result,
    execute,
    reset,
  };
}

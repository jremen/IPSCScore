import { useCallback, useState } from 'react';

/**
 * Small state container for an async mutation.
 *
 * Components should use this instead of declaring their own loading/result/error
 * state and try/catch/finally blocks.
 */
export function useMutationState<TResult>() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TResult | null>(null);
  const [error, setError] = useState<unknown>(null);

  const reset = useCallback(() => {
    setLoading(false);
    setResult(null);
    setError(null);
  }, []);

  const run = useCallback(async (operation: () => Promise<TResult>): Promise<TResult> => {
    setLoading(true);
    setError(null);
    try {
      const value = await operation();
      setResult(value);
      return value;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, result, error, setResult, reset, run };
}

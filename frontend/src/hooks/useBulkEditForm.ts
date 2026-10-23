import { useCallback, useState } from 'react';
import type { BulkEditForm } from '../components/shared/BulkEditFormFields';

/** Shared checked-field form state for the two bulk-edit modals. */
export function useBulkEditForm(createInitial: () => BulkEditForm) {
  const [form, setForm] = useState<BulkEditForm>(createInitial);
  const reset = useCallback(() => setForm(createInitial()), [createInitial]);
  return { form, setForm, reset };
}

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getDivisionsForMatch,
  getDivisionsForOrganization,
  getGroupedDivisions,
} from '../utils/constants';
import type { BulkEditForm, BulkEditFormFieldsProps } from '../components/shared/types';

export function useBulkEditFormFields({
  form,
  onChange,
  organization,
  firearmType,
}: Pick<BulkEditFormFieldsProps, 'form' | 'onChange' | 'organization' | 'firearmType'>) {
  const { t } = useTranslation();
  const hasMatchContext = Boolean(firearmType || organization);
  const divisions = hasMatchContext
    ? getDivisionsForMatch({ organization, firearm_type: firearmType })
    : getDivisionsForOrganization(organization);
  const groupedDivisions = hasMatchContext ? null : getGroupedDivisions();

  const update = useCallback(
    (patch: Partial<BulkEditForm>) => onChange({ ...form, ...patch }),
    [form, onChange],
  );

  return { t, divisions, groupedDivisions, update };
}

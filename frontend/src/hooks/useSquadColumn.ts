import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { filterRegistrationsByName } from '../utils/registration';
import type { SquadColumnProps } from '../components/registration/types';

export function useSquadColumn({
  squadNumber,
  shooters,
  query,
}: Pick<SquadColumnProps, 'squadNumber' | 'shooters' | 'query'>) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id: `squad-${squadNumber}`,
    data: { squadNumber },
  });
  const filtered = useMemo(() => filterRegistrationsByName(shooters, query), [query, shooters]);

  return { t, setNodeRef, isOver, filtered };
}

import { Badge, Button, Checkbox, TableCell, TableRow } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { divisionLabel } from '../../utils/constants';
import { groupColor } from '../../utils/groupColors';
import { useConstLabels } from '../../hooks/useConstLabels';
import { GripHandle } from './GripHandle';
import type { RegistrationRowProps } from './types';

export function RegistrationRow({
  registration,
  index,
  selection,
  onEdit,
  onRemove,
  onUngroup,
  showDivision,
}: RegistrationRowProps) {
  const { t } = useTranslation();
  const { categoryLabel, powerFactorLabel } = useConstLabels();
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `reg-drop-${registration.id}`,
    data: { registration },
  });

  const groupBorderColor = registration.group_id ? groupColor(registration.group_id) : undefined;

  return (
    <TableRow
      ref={setDropRef}
      className={`${registration.is_dq ? 'bg-red-50 dark:bg-red-900/20' : selection.isSelected(registration.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${isOver ? 'ring-2 ring-blue-400' : ''}`}
    >
      <TableCell className="w-4! pr-0">
        <Checkbox className="size-5 cursor-pointer" checked={selection.isSelected(registration.id)} onChange={() => selection.toggle(registration.id)} />
      </TableCell>

      <TableCell className="font-mono text-gray-500">{index + 1}</TableCell>
      <TableCell className="font-medium dark:text-white whitespace-nowrap">
        {registration.first_name} {registration.last_name}
      </TableCell>
      {showDivision && (
        <TableCell>
          <Badge color="blue" size="xs">{divisionLabel(registration.effective_division)}</Badge>
        </TableCell>
      )}
      <TableCell>
        <Badge color="gray" size="xs">{categoryLabel(registration.effective_category)}</Badge>
      </TableCell>
      <TableCell>
        <Badge color={registration.effective_power_factor === 'major' ? 'warning' : 'success'} size="xs">{powerFactorLabel(registration.effective_power_factor)}</Badge>
      </TableCell>
      <TableCell className="font-mono">{registration.squad === null || registration.squad === undefined ? '—' : Number(registration.squad)}</TableCell>
      <TableCell>
        {registration.is_dq ? (
          <Badge color="failure" size="sm">{t('registration.dq')}</Badge>
        ) : (
          <Badge color="success" size="sm">{t('registration.active')}</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="xs" color="blue" onClick={(e) => { e.stopPropagation(); onEdit(registration); }}>{t('common.edit')}</Button>
          <Button size="xs" color="red" onClick={(e) => { e.stopPropagation(); onRemove(registration.id); }}>{t('common.remove')}</Button>
        </div>
      </TableCell>
      <TableCell className="p-0 w-8 min-w-8 relative">
        <GripHandle registration={registration} />
        <div
          className="w-1.5 h-full absolute top-0 right-0 cursor-pointer hover:opacity-80 transition-opacity"
          style={{ backgroundColor: groupBorderColor || 'transparent' }}
          title={groupBorderColor ? t('registration.ungroup') : undefined}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            if (!groupBorderColor) return;
            e.stopPropagation();
            onUngroup(registration.id);
          }}
        />
      </TableCell>
    </TableRow>
  );
}

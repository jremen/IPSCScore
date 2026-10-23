import { Badge, Button, Checkbox, TableCell, TableRow } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { divisionLabel } from '../../utils/constants';
import { useConstLabels } from '../../hooks/useConstLabels';
import type { ShooterRowProps } from './types';

export default function ShooterRow({ shooter, selected, onToggle, onEdit, onDelete, onRestore }: ShooterRowProps) {
  const { t } = useTranslation();
  const { categoryLabel, powerFactorLabel } = useConstLabels();
  const isDeleted = Boolean(shooter.deleted_at);

  return (
    <TableRow className={`${selected ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${isDeleted ? 'opacity-60' : ''}`}>
      <TableCell>
        <Checkbox className="size-5 cursor-pointer" checked={selected} onChange={() => onToggle(shooter.id)} />
      </TableCell>
      <TableCell className={`font-medium dark:text-white ${isDeleted ? 'line-through' : ''}`}>
        {shooter.first_name} {shooter.last_name}
        {isDeleted && <Badge color="gray" className="inline ml-2 text-xs">{t('shooters.deletedBadge')}</Badge>}
      </TableCell>
      <TableCell>{categoryLabel(shooter.category)}</TableCell>
      <TableCell>{divisionLabel(shooter.division)}</TableCell>
      <TableCell>{powerFactorLabel(shooter.power_factor)}</TableCell>
      <TableCell>{shooter.region}</TableCell>
      <TableCell>{shooter.tag || '—'}</TableCell>
      <TableCell>
        {isDeleted ? (
          <Button size="xs" color="green" onClick={() => onRestore(shooter.id)}>{t('shooters.restore')}</Button>
        ) : (
          <div className="flex gap-1">
            <Button size="xs" color="blue" onClick={() => onEdit(shooter)}>{t('common.edit')}</Button>
            <Button size="xs" color="red" onClick={() => onDelete(shooter)}>{t('common.delete')}</Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

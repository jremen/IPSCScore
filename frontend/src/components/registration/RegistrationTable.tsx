import { Table, TableBody, TableHead, TableHeadCell, TableRow } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { DragOverlay, DndContext, closestCenter } from '@dnd-kit/core';
import { divisionLabel } from '../../utils/constants';
import { useRegistrationDnd } from '../../hooks/useRegistrationDnd';
import SelectAllCheckbox from '../shared/SelectAllCheckbox';
import { RegistrationRow } from './RegistrationRow';
import type { RegistrationTableProps } from './types';

export default function RegistrationTable({
  registrations,
  totalCount,
  selection,
  onEdit,
  onRemove,
  onUngroup,
  onDragToGroup,
  showDivision = true,
}: RegistrationTableProps) {
  const { t } = useTranslation();
  const { activeRegistration, sensors, handleDragStart, handleDragEnd } = useRegistrationDnd(onDragToGroup);

  if (registrations.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Table striped theme={{ root: { shadow: 'hidden' } }}>
          <TableHead>
            <TableRow>
              <TableHeadCell className="w-4 pr-0!">
                <SelectAllCheckbox
                  allSelected={selection.allSelected}
                  someSelected={selection.someSelected}
                  onToggle={selection.allSelected ? selection.deselectAll : selection.selectAll}
                  selectedCount={selection.selectedCount}
                  totalCount={totalCount}
                />
              </TableHeadCell>
              <TableHeadCell className="w-2!">#</TableHeadCell>
              <TableHeadCell>{t('common.name')}</TableHeadCell>
              {showDivision && <TableHeadCell>{t('shooters.division')}</TableHeadCell>}
              <TableHeadCell>{t('shooters.category')}</TableHeadCell>
              <TableHeadCell>PF</TableHeadCell>
              <TableHeadCell>{t('registration.squad')}</TableHeadCell>
              <TableHeadCell />
              <TableHeadCell>{t('common.actions')}</TableHeadCell>
              <TableHeadCell className="w-8" />
            </TableRow>
          </TableHead>
          <TableBody>
            {registrations.map((registration, index) => (
              <RegistrationRow
                key={registration.id}
                registration={registration}
                index={index}
                selection={selection}
                onEdit={onEdit}
                onRemove={onRemove}
                onUngroup={onUngroup}
                showDivision={showDivision}
              />
            ))}
          </TableBody>
        </Table>

        <DragOverlay>
          {activeRegistration && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 pl-3 shadow-lg opacity-90 min-w-37.5">
              <div className="font-medium text-sm dark:text-white">
                {activeRegistration.first_name} {activeRegistration.last_name}
              </div>
              {showDivision && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {divisionLabel(activeRegistration.effective_division)}
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

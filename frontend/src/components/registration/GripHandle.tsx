import { useDraggable } from '@dnd-kit/core';
import { Tooltip } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { TbGripVertical } from 'react-icons/tb';
import type { GripHandleProps } from './types';

export function GripHandle({ registration }: GripHandleProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `reg-drag-${registration.id}`,
    data: { registration },
  });

  return (
    <Tooltip content={t('registration.squadGroup')}>
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className="flex ml-auto items-center justify-center cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-300"
      >
        <TbGripVertical className="size-5" />
      </div>
    </Tooltip>
  );
}

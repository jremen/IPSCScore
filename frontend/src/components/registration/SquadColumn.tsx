import { Button } from 'flowbite-react';
import { TbUserPlus } from 'react-icons/tb';
import ShooterCard from './ShooterCard';
import { useSquadColumn } from '../../hooks/useSquadColumn';
import type { SquadColumnProps } from './types';

export default function SquadColumn({ squadNumber, shooters, onAddShooter, onRemoveFromGroup, query }: SquadColumnProps) {
  const { t, setNodeRef, isOver, filtered } = useSquadColumn({ squadNumber, shooters, query });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col md:w-[calc(50%-16px)] bg-gray-50 dark:bg-gray-800/50 border rounded-lg overflow-hidden transition-colors ${
        isOver ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
        <span className="font-semibold text-sm dark:text-white">
          {t('squadding.squadN', { number: squadNumber })}
        </span>
        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
          ({shooters.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-20 max-h-100">
        {filtered.length > 0 ? (
          filtered.map((registration) => (
            <ShooterCard
              key={registration.shooter_id}
              registration={registration}
              onRemoveFromGroup={onRemoveFromGroup}
            />
          ))
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
            {query ? t('squadding.searchEmpty') : t('squadding.noShooters')}
          </p>
        )}
      </div>

      <div className="px-2 py-2 border-t border-gray-200 dark:border-gray-700">
        <Button size="xs" color="light" className="w-full" onClick={onAddShooter}>
          <TbUserPlus className="mr-1 size-3" />
          {t('squadding.addShooter')}
        </Button>
      </div>
    </div>
  );
}

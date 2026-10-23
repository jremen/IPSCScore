import { Checkbox } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../stores/matchStore';
import { formatDate } from '../../utils/constants';
import type { MatchPickerProps } from './types';

export default function MatchPicker({ selected, onToggle, excludeIds }: MatchPickerProps) {
  const matches = useMatchStore((s) => s.matches);
  const { t } = useTranslation();
  const options = matches.filter((match: any) => !excludeIds?.has(match.id));

  return (
    <div className="max-h-56 overflow-y-auto border rounded p-2 space-y-1">
      {options.length === 0 && <p className="text-sm text-gray-500">{t('cups.noAvailableMatches')}</p>}
      {options.map((match: any) => (
        <label key={match.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
          <Checkbox
            className="size-4"
            checked={selected.has(match.id)}
            onChange={() => onToggle(match.id)}
          />
          <span className="dark:text-white">{match.name}</span>
          <span className="text-gray-500 text-xs ml-auto">{formatDate(match.date)}</span>
        </label>
      ))}
    </div>
  );
}

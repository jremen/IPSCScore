import { Badge } from 'flowbite-react';
import { InputField } from '../../shared/InputField';
import { useTranslation } from "react-i18next";

import type { DesktopPaperTargetsProps } from '../types';
import { getPaperZoneFields } from './desktopPaperTargetsConfig';

export default function DesktopPaperTargets({
  paperTargets,
  hpp,
  hasNoShootTargets,
  paperTotals,
  onPaperTotalsChange,
  disabled = false,
}: DesktopPaperTargetsProps) {
  const {t, i18n} = useTranslation();
  const numTargets = paperTargets.length;
  const maxHits = numTargets * hpp;
  const totalScoring = paperTotals.alpha + paperTotals.charlie + paperTotals.delta;
  const totalAll = totalScoring + paperTotals.miss;

  const fields = getPaperZoneFields(hasNoShootTargets);

  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-bold text-blue-600 dark:text-white uppercase tracking-wide">{t('scoring.paperTargets')}</span>
        <Badge size="sm" color="blue">{numTargets}</Badge>
        <span className="text-xs text-gray-500 dark:text-gray-300 ml-1">{i18n.t('scoring.paperHitsEach', {hpp})}</span>
      </div>

      {/* Aggregated zone inputs */}
      <div className="space-y-2 grid grid-cols-2">
        {fields.map(({ field, label, color }) => (
          <div key={field} className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <label className="font-bold uppercase w-6 text-center dark:text-white">
              {label}
            </label>
            <InputField
              type="number"
              step="1"
              min="0"
              sizing="sm"
              onFocus={(e) => e.target.select()}
              className={`w-20 h-9 text-center font-mono text-lg font-bold rounded-lg border-2 ${color}`}
              value={paperTotals[field]}
              disabled={disabled}
              onChange={(v) => {
                const val = v === '' ? 0 : parseInt(v, 10);
                onPaperTotalsChange(field, isNaN(val) ? 0 : val);
              }}
            />
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-3 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-300">
        <span>
          {i18n.t('scoring.scoringSummary', {scoring: totalAll, total: maxHits })}
        </span>
        <span>•</span>
        <span>
          {i18n.t('scoring.maxHits', {max: maxHits, numTargets: numTargets, hpp})}
        </span>
      </div>
    </div>
  );
}

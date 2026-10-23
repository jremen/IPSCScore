import { Alert, Badge, Label } from 'flowbite-react';
import TimeInput from '../shared/TimeInput';
import { useScoringStore } from '../../../stores/scoringStore';
import { useDeviceContext } from '../../../hooks/useDeviceContext';
import { useScoringReadOnly } from '../../../hooks/useScoringReadOnly';
import { HitCell, ScoringSheetHeader, DnfToggle, DqSection, PenaltyStepper } from '../shared';
import IDPAScorePreviewCard from './IDPAScorePreviewCard';
import { useIDPAScoring } from '../../../hooks/useIDPAScoring';
import type { ScoringSheetProps } from '../types';
import { useTranslation } from 'react-i18next';

export default function IDPAScoringSheet({ stage, score }: ScoringSheetProps) {
  const { t, i18n } = useTranslation();
  const { isDesktop } = useDeviceContext();
  const alerts = useScoringStore((s) => s.alerts);
  const shooter = useScoringStore((s) => s.registrations.find((registration) => registration.id === s.currentRegistrationId));
  const isReadOnly = useScoringReadOnly();
  const {
    hpp,
    sd,
    paperTargets,
    steelTargets,
    steelMisses,
    isTargetFinished,
    handlePaperHitClick,
    handlePaperMissClick,
    handlePaperDecrement,
    handlePaperNSClick,
    handleResetTarget,
    handleSteelMissChange,
    handleTimeChange,
    handleResetAll,
    handleDnfToggle,
    handlePenaltyChange,
    handlePenaltyIncrement,
    handleFtdrChange,
    preview,
    penalties,
    penalty_ftdr,
  } = useIDPAScoring(stage, score);

  return (
    <div className="p-2 sm:p-4 max-w-7xl mx-auto lg:grid grid-cols-2 gap-6">
      <div className="lg:hidden max-lg:mb-3 max-lg:p-3 max-lg:dark:bg-gray-800 max-lg:rounded-lg max-lg:border max-lg:border-gray-200 max-lg:dark:border-gray-700">
        <Label className="text-sm font-bold mb-1 block">{t('scoring.time')}</Label>
        <TimeInput value={score.time} onChange={handleTimeChange} disabled={isReadOnly} className="py-1!" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-lg:mb-3 shadow-sm -order-1">
        <ScoringSheetHeader
          title={t('scoring.idpaTitle')}
          subtitle={t('scoring.idpaSubtitle', { paper: stage.paper_targets, hpp, steel: stage.steel_targets })}
          onReset={isReadOnly ? undefined : handleResetAll}
        />
        {isDesktop ? (
          <p className="text-2.5 text-gray-500 dark:text-gray-300 px-3 my-1">{t('scoring.desktopInstruction')}</p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-300 px-3 my-1">{t('scoring.mobileInstruction')}</p>
        )}

        {paperTargets.length > 0 && (
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{t('scoring.paperTargets')}</span>
              <Badge size="sm" color="blue">{paperTargets.length}</Badge>
            </div>
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-center">
                    <th className="px-1 sm:px-2 py-1 text-xs font-bold text-gray-500 w-8">#</th>
                    <th className="px-1 sm:px-2 py-1 text-xs font-bold text-green-600">-0</th>
                    <th className="px-1 sm:px-2 py-1 text-xs font-bold text-yellow-600">-1</th>
                    <th className="px-1 sm:px-2 py-1 text-xs font-bold text-orange-600">-3</th>
                    <th className="px-1 sm:px-2 py-1 text-xs font-bold text-red-600">M</th>
                    <th className={`px-1 sm:px-2 py-1 text-xs font-bold text-red-500 ${stage.no_shoot_targets === 0 ? 'opacity-40' : ''}`}>PT</th>
                  </tr>
                </thead>
                <tbody>
                  {paperTargets.map((target, index) => (
                    <tr key={target.target_index} className={`text-center border-t border-gray-100 dark:border-gray-700 transition-colors ${isTargetFinished(target) ? 'bg-green-50 dark:bg-green-900/60' : ''}`}>
                      <td className="py-1.5">
                        <button
                          className={`font-mono text-sm font-bold ${isReadOnly ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:text-red-500 cursor-pointer'}`}
                          onClick={isReadOnly ? undefined : () => handleResetTarget(target.target_index)}
                          disabled={isReadOnly}
                        >
                          {index + 1}
                        </button>
                      </td>
                      <td className="py-1.5"><div className="flex justify-center"><HitCell value={target.alpha} color="green" onIncrement={() => handlePaperHitClick(target.target_index, 'alpha')} onDecrement={() => handlePaperDecrement(target.target_index, 'alpha')} disabled={isReadOnly} /></div></td>
                      <td className="py-1.5"><div className="flex justify-center"><HitCell value={target.charlie} color="yellow" onIncrement={() => handlePaperHitClick(target.target_index, 'charlie')} onDecrement={() => handlePaperDecrement(target.target_index, 'charlie')} disabled={isReadOnly} /></div></td>
                      <td className="py-1.5"><div className="flex justify-center"><HitCell value={target.delta} color="orange" onIncrement={() => handlePaperHitClick(target.target_index, 'delta')} onDecrement={() => handlePaperDecrement(target.target_index, 'delta')} disabled={isReadOnly} /></div></td>
                      <td className="py-1.5"><div className="flex justify-center"><HitCell value={target.miss} color="red" onIncrement={() => handlePaperMissClick(target.target_index)} onDecrement={() => handlePaperDecrement(target.target_index, 'miss')} disabled={isReadOnly} /></div></td>
                      <td className="py-1.5">
                        <div className="flex justify-center">
                          {stage.no_shoot_targets > 0 ? (
                            <HitCell value={target.no_shoot_hits} color="red" onIncrement={() => handlePaperNSClick(target.target_index, 1)} onDecrement={() => handlePaperNSClick(target.target_index, -1)} disabled={isReadOnly} />
                          ) : (
                            <button className="w-11 h-11 rounded-lg flex items-center justify-center font-mono text-xl font-bold bg-gray-50 dark:bg-gray-700/50 text-gray-300 dark:text-gray-500 ring-1 ring-gray-200 dark:ring-gray-600 cursor-not-allowed" disabled>0</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              {i18n.t('scoring.finished', { hpp, finished: paperTargets.filter(isTargetFinished).length, total: paperTargets.length })}
            </p>
          </div>
        )}

        {steelTargets.length > 0 && (
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('scoring.steelTargets')}</span>
              <Badge size="sm" color="gray">{steelTargets.length}</Badge>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <span className="text-xs text-gray-400 block">{t('scoring.misses')}</span>
                <div className="flex items-center gap-0.5 mt-1">
                  <button className={`penalty-stepper rounded text-lg font-bold bg-gray-200 dark:bg-gray-600 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'active:bg-gray-300'}`} onClick={isReadOnly ? undefined : () => handleSteelMissChange(steelMisses - 1)} disabled={isReadOnly}>−</button>
                  <span className="w-8 text-center text-xl font-mono font-bold text-red-600 dark:text-red-400">{steelMisses}</span>
                  <button className={`penalty-stepper rounded text-lg font-bold bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'active:bg-red-200'}`} onClick={isReadOnly ? undefined : () => handleSteelMissChange(steelMisses + 1)} disabled={isReadOnly}>+</button>
                </div>
              </div>
              <div className="text-center">
                <span className="text-xs text-gray-400 block">{t('scoring.hits')}</span>
                <span className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">{steelTargets.length - steelMisses}</span>
                <span className="text-lg font-mono text-gray-400"> / {steelTargets.length}</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">{t('scoring.idpaPenalties')}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {penalties.map(({ key, label, sec }) => (
              <div key={key}>
                <Label className="text-xs">{label} <span className="text-gray-400">{t('scoring.secondsEach', { sec })}</span></Label>
                <PenaltyStepper
                  value={(sd[key] as number) || 0}
                  onDecrement={() => handlePenaltyChange(key, -1)}
                  onIncrement={() => handlePenaltyIncrement(key)}
                  color="orange"
                  size="sm"
                  disabled={isReadOnly}
                />
              </div>
            ))}
            <div className="col-span-2">
              <Label className="text-xs">{t('scoring.ftdrFailToDoRight')} <span className="text-gray-400">{t('scoring.secondsEach', { sec: 20 })}</span></Label>
              <PenaltyStepper
                value={penalty_ftdr}
                onDecrement={() => handleFtdrChange(-1)}
                onIncrement={() => handleFtdrChange(1)}
                color="red"
                size="sm"
                disabled={isReadOnly}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="lg:flex flex-col gap-6 mb-16">
        <div className="max-lg:hidden max-lg:p-3 max-lg:dark:bg-gray-800 max-lg:rounded-lg max-lg:border max-lg:border-gray-200 max-lg:dark:border-gray-700">
          <Label className="text-sm font-bold mb-1 block">{t('scoring.time')}</Label>
          <TimeInput value={score.time} onChange={handleTimeChange} disabled={isReadOnly} className="py-1!" />
        </div>
        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <DnfToggle isDnf={score.is_dnf} onToggle={handleDnfToggle} disabled={isReadOnly} />
          <DqSection shooter={shooter} disabled={isReadOnly} />
        </div>
        <IDPAScorePreviewCard raw_points={preview.raw_points} total_time={preview.total_time || 0} />
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2 mb-3">
          {alerts.map((alert, index) => (
            <Alert key={index} color={alert.type === 'error' ? 'failure' : 'warning'}>{alert.message}</Alert>
          ))}
        </div>
      )}
    </div>
  );
}

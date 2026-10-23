import { Label, Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../../../stores/scoringStore';
import { useIPSCScoring } from '../../../hooks/useIPSCScoring';
import { useDeviceContext } from '../../../hooks/useDeviceContext';
import { useScoringReadOnly } from '../../../hooks/useScoringReadOnly';
import { ScoringSheetHeader, DnfToggle, DqSection, ScorePreviewCard, ProceduralsSection } from '../shared';
import TimeInput from '../shared/TimeInput';
import PaperTargetsTable from './IPSCPaperTargets';
import DesktopPaperTargets from './DesktopPaperTargets';
import DesktopSteelTargets from './DesktopSteelTargets';
import NoShootSection from './IPSCNoShootTargets';
import type { ScoringSheetProps } from '../types';

export default function IPSCScoringSheet({ stage, score }: ScoringSheetProps) {
  const { t, i18n } = useTranslation();
  const { isDesktop } = useDeviceContext();
  const alerts = useScoringStore((s) => s.alerts);
  const shooter = useScoringStore(
    (s) => s.registrations.find(r => r.id === s.currentRegistrationId)
  );
  const isReadOnly = useScoringReadOnly();

  const {
    paperTargets, steelTargets, noShootTargets, npmTargets, noShootHits, steelMisses, steelNSHits,
    npmHits, paperTotals, isTargetFinished, handlePaperHitClick, handlePaperMissClick, handlePaperDecrement,
    handlePaperTotalsChange, handlePaperNSClick, handleResetTarget, handleSteelMissChange,
    handleSteelNSClick, handleResetSteel, steelHits, handleSteelHitIncrement, handleSteelHitDecrement,
    handleSteelMissIncrement, handleSteelMissDecrement,
    handleNpmHitIncrement, handleNpmHitDecrement, handleNpmHitChange, handleResetNpm,
    handleNoShootChange, handleTimeChange, handleResetAll, handleProceduralChange,
    handlePenaltyFieldChange, handleDnfToggle, preview, isVirginia, isFixedTime,
    showExtraPenalties, hasSidebar, hasNoShootTargets, hasAnyTargets, subtitle, hpp,
  } = useIPSCScoring(stage, score);

  return (
    <div className="p-2 sm:p-4 max-w-7xl mx-auto lg:grid grid-cols-2 gap-6">

      <div className="lg:hidden lg:my-3 my-6 max-lg:p-3 max-lg:dark:bg-gray-800 max-lg:rounded-lg max-lg:border max-lg:border-gray-200 max-lg:dark:border-gray-700 max-lg:eink:border-black! max-lg:eink:bg-white!">
        <Label className="text-sm font-bold mb-1 block">{t('scoring.time')}</Label>
        <TimeInput
          value={score.time}
          onChange={handleTimeChange}
          disabled={isReadOnly || stage.scoring_type === 'fixed_time'}
          className="py-1!"
        />
        {stage.scoring_type === 'fixed_time' && stage.par_time && (
          <p className="text-xs text-gray-500 dark:text-gray-300 mt-1 text-center">{i18n.t('scoring.parTime')} {stage.par_time}s</p>
        )}
      </div>
      
      {/* SCORING SHEET — two-column on desktop when sidebar exists */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-lg:mb-3 shadow-sm -order-1">
        <ScoringSheetHeader
          subtitle={subtitle}
          onReset={isReadOnly ? undefined : handleResetAll}
        />
        {isDesktop ? (
          <p className="text-2.5 text-gray-500 dark:text-gray-300 px-3 my-1">{t('scoring.desktopInstruction')}</p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-300 px-3 my-1">{t('scoring.mobileInstruction')}</p>
        )}

        {/* Main content area: flex row on desktop when sidebar exists */}
        <div className={hasSidebar ? 'md:flex' : ''}>
          {/* MOBILE: unified scoring table (steel row + paper targets) */}
          {/* DESKTOP: paper targets only (steel in sidebar) */}
          <div className={hasSidebar ? 'md:flex-1 md:min-w-0' : ''}>
            {(paperTargets.length > 0 || steelTargets.length > 0) && (
              isDesktop ? (
                <DesktopPaperTargets
                  paperTargets={paperTargets}
                  hpp={hpp}
                  hasNoShootTargets={hasNoShootTargets}
                  paperTotals={paperTotals}
                  onPaperTotalsChange={handlePaperTotalsChange}
                />
              ) : (
                <PaperTargetsTable
                  paperTargets={paperTargets}
                  hpp={hpp}
                  hasNoShootTargets={hasNoShootTargets}
                  isTargetFinished={isTargetFinished}
                  onHitClick={handlePaperHitClick}
                  onMissClick={handlePaperMissClick}
                  onDecrement={handlePaperDecrement}
                  onNSClick={handlePaperNSClick}
                  onResetTarget={handleResetTarget}
                  disabled={isReadOnly}
                  steelCount={steelTargets.length}
                  steelHits={steelHits}
                  steelMisses={steelMisses}
                  onSteelHitIncrement={handleSteelHitIncrement}
                  onSteelHitDecrement={handleSteelHitDecrement}
                  onSteelMissIncrement={handleSteelMissIncrement}
                  onSteelMissDecrement={handleSteelMissDecrement}
                  onSteelNSClick={handleSteelNSClick}
                  steelNSHits={steelNSHits}
                  onResetSteel={handleResetSteel}
                  npmCount={npmTargets.length}
                  npmHits={npmHits}
                  onNpmHitIncrement={handleNpmHitIncrement}
                  onNpmHitDecrement={handleNpmHitDecrement}
                  onResetNpm={handleResetNpm}
                />
              )
            )}
            {!hasAnyTargets && (
              <div className="mx-3 my-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200">
                {t('scoring.noTargetsConfigured')}
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: Steel, No-Shoot, Procedurals (desktop only) */}
          {hasSidebar && (
            <div className="md:w-72 md:shrink-0 md:border-l md:border-gray-200 dark:md:border-gray-700">
              {(steelTargets.length > 0 || npmTargets.length > 0) && isDesktop && (
                <DesktopSteelTargets
                  steelTargets={steelTargets}
                  steelMisses={steelMisses}
                  onSteelMissChange={handleSteelMissChange}
                  disabled={isReadOnly}
                  steelNSHits={steelNSHits}
                  onSteelNSChange={handleSteelNSClick}
                  npmCount={npmTargets.length}
                  npmHits={npmHits}
                  onNpmHitChange={handleNpmHitChange}
                />
              )}
              {/* No-Shoot section: show standalone only when no paper targets and no steel targets */}
              {noShootTargets.length > 0 && paperTargets.length === 0 && steelTargets.length === 0 && (
                <NoShootSection noShootHits={noShootHits} onNoShootChange={handleNoShootChange} disabled={isReadOnly} />
              )}
              <ProceduralsSection
                proceduralCount={score.procedural_count}
                onProceduralChange={handleProceduralChange}
                showExtraPenalties={showExtraPenalties}
                isVirginia={isVirginia}
                isFixedTime={isFixedTime}
                extraShotCount={score.extra_shot_count}
                extraHitCount={score.extra_hit_count}
                stackingCount={score.stacking_count}
                overtimeShotCount={score.overtime_shot_count}
                onPenaltyFieldChange={handlePenaltyFieldChange}
                disabled={isReadOnly}
              />
            </div>
          )}
        </div>

        {/* When no sidebar: Procedurals and Virginia penalties go below paper targets inside the card */}
        {!hasSidebar && (
          <ProceduralsSection
            proceduralCount={score.procedural_count}
            onProceduralChange={handleProceduralChange}
            showExtraPenalties={showExtraPenalties}
            isVirginia={isVirginia}
            isFixedTime={isFixedTime}
            extraShotCount={score.extra_shot_count}
            extraHitCount={score.extra_hit_count}
            stackingCount={score.stacking_count}
            overtimeShotCount={score.overtime_shot_count}
            onPenaltyFieldChange={handlePenaltyFieldChange}
            disabled={isReadOnly}
          />
        )}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-3">
          {alerts.map((alert, i) => (
            <Alert key={i} color={alert.type === 'error' ? 'failure' : 'warning'}>{alert.message}</Alert>
          ))}
        </div>
      )}

      {/* DNF + DQ toggles */}
      <div className="lg:flex flex-col gap-6 mb-16">
        <div className="max-lg:hidden lg:my-3 my-6 max-lg:p-3 max-lg:dark:bg-gray-800 max-lg:rounded-lg max-lg:border max-lg:border-gray-200 max-lg:dark:border-gray-700 max-lg:eink:border-black! max-lg:eink:bg-white!">
          <Label className="text-sm font-bold mb-1 block">{t('scoring.time')}</Label>
          <TimeInput
            value={score.time}
            onChange={handleTimeChange}
            disabled={isReadOnly || stage.scoring_type === 'fixed_time'}
            className="py-1!"
          />
          {stage.scoring_type === 'fixed_time' && stage.par_time && (
            <p className="text-xs text-gray-500 dark:text-gray-300 mt-1 text-center">{i18n.t('scoring.parTime')} {stage.par_time}s</p>
          )}
        </div>
        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <DnfToggle isDnf={score.is_dnf} onToggle={handleDnfToggle} disabled={isReadOnly} />
          <DqSection shooter={shooter} disabled={isReadOnly} />
        </div>

        {/* Live Score Preview */}
        <ScorePreviewCard preview={preview} />
      </div>
    </div>
  );
}

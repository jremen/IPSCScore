import { Modal, ModalHeader, ModalBody, ModalFooter, Button, TextInput, Textarea, Select, Label, Checkbox } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { SCORING_TYPES, ISSF_COURSE_TYPES, translateItem } from '../../utils/constants';
import TimeInput from '../scoring/shared/TimeInput';
import { InputField } from '../shared/InputField';
import { useStageFormModal } from '../../hooks/useStageFormModal';
import type { ScoringType } from '../../types/stage';
import type { StageFormModalProps } from './types';

export default function StageFormModal({ show, onClose, editStage, matchId }: StageFormModalProps) {
  const { t } = useTranslation();
  const {
    form,
    matchFirearmType,
    visibleFields,
    title,
    submitLabel,
    updateField,
    updateConfig,
    handleScoringTypeChange,
    handleNoShootChange,
    handleCourseTypeChange,
    handleSubmit,
  } = useStageFormModal({ show, onClose, editStage, matchId });

  return (
    <Modal show={show} onClose={onClose} size="xl">
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-4">
          <div>
            <Label>{t('stages.name')}</Label>
            <TextInput
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder={t('stages.namePlaceholder')}
            />
          </div>
          <div>
            <Label>{t('stages.scoringType')}</Label>
            <Select
              value={form.scoring_type}
              onChange={(e) => handleScoringTypeChange(e.target.value as ScoringType)}
            >
              {SCORING_TYPES.map((scoringType) => (
                <option key={scoringType.value} value={scoringType.value}>{translateItem(t, scoringType)}</option>
              ))}
            </Select>
          </div>

          {visibleFields.paperTargets && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <InputField label={t('stages.paperTargets')} type="number" step="1" min="0" value={form.paper_targets} onChange={(value) => updateField('paper_targets', parseInt(value) || 0)} />
                <InputField label={t('stages.steelTargets')} type="number" step="1" min="0" value={form.steel_targets} onChange={(value) => updateField('steel_targets', parseInt(value) || 0)} />
                <InputField label={t('stages.npmTargets')} type="number" step="1" min="0" value={form.npm_targets} onChange={(value) => updateField('npm_targets', parseInt(value) || 0)} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  className="size-5 cursor-pointer"
                  id="no-shoot"
                  checked={form.no_shoot_targets > 0}
                  onChange={(e) => handleNoShootChange(e.target.checked)}
                />
                <Label className="cursor-pointer" htmlFor="no-shoot">{t('stages.hasNoShootTargets')}</Label>
              </div>
            </div>
          )}

          {(visibleFields.hitsPerPaper || visibleFields.parTime) && (
            <div className="grid grid-cols-2 gap-3">
              {visibleFields.hitsPerPaper && (
                <div>
                  <InputField label={t('stages.hitsPerPaper')} type="number" step="1" min="1" value={form.hits_per_paper} onChange={(value) => updateField('hits_per_paper', parseInt(value) || 2)} />
                  {matchFirearmType === 'rifle' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('stages.hitsPerPaperRifleHint')}</p>
                  )}
                </div>
              )}
              {visibleFields.parTime && (
                <div>
                  <Label>{t('stages.parTime')}</Label>
                  <TimeInput
                    regular
                    value={form.par_time}
                    onChange={(value) => updateField('par_time', value)}
                    disabled={form.scoring_type !== 'fixed_time'}
                  />
                </div>
              )}
            </div>
          )}

          {visibleFields.config && form.scoring_type === 'action_steel' && (
            <div className="grid grid-cols-3 gap-3">
              <InputField label={t('stages.configNumberOfStrings')} type="number" step="1" min="1" value={form.config.number_of_strings ?? 5} onChange={(value) => updateConfig({ number_of_strings: parseInt(value) || 5 })} />
              <InputField label={t('stages.configTargetsPerString')} type="number" step="1" min="1" value={form.config.targets_per_string ?? 5} onChange={(value) => updateConfig({ targets_per_string: parseInt(value) || 5 })} />
              <InputField label={t('stages.configDropWorst')} type="number" step="1" min="0" value={form.config.drop_worst ?? 1} onChange={(value) => updateConfig({ drop_worst: parseInt(value) || 1 })} />
            </div>
          )}

          {visibleFields.config && form.scoring_type === 'multi_gun' && (
            <div className="grid grid-cols-2 gap-3">
              <InputField label={t('stages.configNumTargets')} type="number" step="1" min="1" value={form.config.num_targets ?? 8} onChange={(value) => updateConfig({ num_targets: parseInt(value) || 8 })} />
              <div>
                <Label>{t('stages.configHasNoShoots')}</Label>
                <Select
                  value={form.config.has_no_shoot ? 'true' : 'false'}
                  onChange={(e) => updateConfig({ has_no_shoot: e.target.value === 'true' })}
                >
                  <option value="false">{t('common.no')}</option>
                  <option value="true">{t('common.yes')}</option>
                </Select>
              </div>
            </div>
          )}

          {visibleFields.config && form.scoring_type === 'long_range' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('stages.configVariant')}</Label>
                <Select
                  value={form.config.variant || 'prs'}
                  onChange={(e) => updateConfig({ variant: e.target.value as 'prs' | 'f_class' })}
                >
                  <option value="prs">{t('stages.configPrsHitMiss')}</option>
                  <option value="f_class">{t('stages.configFClass')}</option>
                </Select>
              </div>
              {form.config.variant === 'f_class' ? (
                <InputField label={t('stages.configShotsPerString')} type="number" step="1" min="1" value={form.config.shots_per_string ?? 20} onChange={(value) => updateConfig({ shots_per_string: parseInt(value) || 20 })} />
              ) : (
                <InputField label={t('stages.configNumTargets')} type="number" step="1" min="1" value={form.config.num_targets ?? 10} onChange={(value) => updateConfig({ num_targets: parseInt(value) || 10 })} />
              )}
            </div>
          )}

          {visibleFields.config && form.scoring_type === 'bullseye' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('stages.configFireType')}</Label>
                <Select
                  value={form.config.fire_type || 'slow'}
                  onChange={(e) => updateConfig({ fire_type: e.target.value as 'slow' | 'timed' | 'rapid' })}
                >
                  <option value="slow">{t('stages.configSlowFire')}</option>
                  <option value="timed">{t('stages.configTimedFire')}</option>
                  <option value="rapid">{t('stages.configRapidFire')}</option>
                </Select>
              </div>
              <InputField label={t('stages.configShotsPerString')} type="number" step="1" min="1" value={form.config.shots_per_string ?? 10} onChange={(value) => updateConfig({ shots_per_string: parseInt(value) || 10 })} />
            </div>
          )}

          {visibleFields.config && form.scoring_type === 'archery' && (
            <InputField label={t('stages.configArrowsPerEnd')} type="number" step="1" min="1" value={form.config.arrows_per_end ?? 6} onChange={(value) => updateConfig({ arrows_per_end: parseInt(value) || 6 })} />
          )}

          {visibleFields.config && form.scoring_type === 'nrl22' && (
            <div className="grid grid-cols-2 gap-3">
              <InputField label={t('stages.configNumTargets')} type="number" step="1" min="1" value={form.config.num_targets ?? 10} onChange={(value) => updateConfig({ num_targets: parseInt(value) || 10 })} />
              <InputField label={t('stages.configPointValue')} type="number" step="1" min="1" value={form.config.point_value ?? 10} onChange={(value) => updateConfig({ point_value: parseInt(value) || 10 })} />
            </div>
          )}

          {visibleFields.config && form.scoring_type === 'issf' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('stages.configCourseType')}</Label>
                <Select value={form.config.course_type || 'custom'} onChange={(e) => handleCourseTypeChange(e.target.value)}>
                  {ISSF_COURSE_TYPES.map((course) => (
                    <option key={course.value} value={course.value}>{translateItem(t, course)}</option>
                  ))}
                </Select>
              </div>
              <InputField label={t('stages.configShotsPerCourse')} type="number" step="1" min="1" value={form.config.shots_per_course ?? 60} onChange={(value) => updateConfig({ shots_per_course: parseInt(value) || 60 })} />
            </div>
          )}

          <div>
            <Label htmlFor="stage-briefing">{t('stages.briefing')}</Label>
            <Textarea
              id="stage-briefing"
              rows={5}
              value={form.briefing}
              onChange={(e) => updateField('briefing', e.target.value)}
              placeholder={t('stages.briefingPlaceholder')}
              className="dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button color="blue" onClick={handleSubmit} disabled={!form.name}>{submitLabel}</Button>
      </ModalFooter>
    </Modal>
  );
}

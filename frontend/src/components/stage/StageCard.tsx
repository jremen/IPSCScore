import { Badge, Button, Card } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { getScoringTypeLabel } from '../../utils/stageList';
import StageImageUpload from './StageImageUpload';
import type { StageCardProps } from './types';

export default function StageCard({ stage, onEdit, onDelete }: StageCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-blue-600 text-lg">#{stage.stage_number}</span>
            <span className="font-semibold dark:text-white">{stage.name}</span>
            <Badge color="indigo">{getScoringTypeLabel(stage.scoring_type, t)}</Badge>
            {stage.par_time && <Badge color="yellow">{t('stages.parTimeBadge', { seconds: stage.par_time })}</Badge>}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-200 space-x-3">
            {stage.paper_targets > 0 && <span>{t('stages.paper')}: {stage.paper_targets}</span>}
            {stage.steel_targets > 0 && <span>{t('stages.steel')}: {stage.steel_targets}</span>}
            {stage.no_shoot_targets > 0 && <span>{t('stages.noShoot')}: {t('common.yes')}</span>}
            {stage.npm_targets > 0 && <span>NPM: {stage.npm_targets}</span>}
            {stage.hits_per_paper > 0 && stage.paper_targets > 0 && <span>{t('stages.hitsPerPaperShort')}: {stage.hits_per_paper}</span>}
            <span>{t('stages.minRoundsShort')}: {stage.min_rounds}</span>
            <span>{t('stages.maxPointsShort')}: {stage.max_points}</span>
            {stage.config && Object.keys(stage.config).length > 0 && (
              <span className="text-xs text-gray-400">
                {stage.config.number_of_strings && `${t('stages.configNumberOfStrings')}: ${stage.config.number_of_strings}`}
                {stage.config.num_targets && ` ${t('stages.configNumTargets')}: ${stage.config.num_targets}`}
                {stage.config.shots_per_string && ` • ${stage.config.shots_per_string}${t('stages.configShotsSuffix')}`}
                {stage.config.fire_type && ` • ${stage.config.fire_type}${t('stages.configFireSuffix')}`}
                {stage.config.variant && ` • ${stage.config.variant}`}
                {stage.config.arrows_per_end && ` • ${stage.config.arrows_per_end}${t('stages.configArrowsSuffix')}`}
                {stage.config.point_value && ` • ${stage.config.point_value}${t('stages.configPointsSuffix')}`}
              </span>
            )}
          </div>
          {stage.image_path && (
            <img
              src={`/api/uploads/${stage.image_path.split('/').pop()}`}
              alt={`Stage ${stage.stage_number} plan`}
              className="mt-2 max-h-40 rounded"
            />
          )}
        </div>
        <div className="flex gap-2 ml-2">
          <StageImageUpload stageId={stage.id} />
          <Button size="xs" color="blue" onClick={() => onEdit(stage)}>{t('common.edit')}</Button>
          <Button size="xs" color="red" onClick={() => onDelete(stage.id)}>{t('common.delete')}</Button>
        </div>
      </div>
    </Card>
  );
}

import { Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useScoringReadOnly } from '../../hooks/useScoringReadOnly';
import IPSCScoringSheet from './sheets/IPSCScoringSheet';
import IDPAScoringSheet from './sheets/IDPAScoringSheet';
import ActionSteelScoringSheet from './sheets/ActionSteelScoringSheet';
import MultiGunScoringSheet from './sheets/MultiGunScoringSheet';
import RingScoringSheet from './sheets/RingScoringSheet';
import HitCountScoringSheet from './sheets/HitCountScoringSheet';

import type { ScoringSheetContainerProps } from './types';

export default function ScoringSheet({ stage, score }: ScoringSheetContainerProps) {
  const scoringType = stage.scoring_type;
  const config = stage.config || {};
  const isReadOnly = useScoringReadOnly();
  const { t } = useTranslation();

  return (
    <>
      {isReadOnly && (
        <Alert color="warning" className="mx-2 mt-2">
          {t('scoring.scoreLocked')}
        </Alert>
      )}
      {(() => {
        switch (scoringType) {
          case 'idpa':
            return <IDPAScoringSheet stage={stage} score={score} />;
          case 'action_steel':
            return <ActionSteelScoringSheet stage={stage} score={score} />;
          case 'multi_gun':
            return <MultiGunScoringSheet score={score} />;
          case 'bullseye':
          case 'archery':
          case 'issf':
            return <RingScoringSheet stage={stage} score={score} />;
          case 'long_range':
            if (config.variant === 'f_class') {
              return <RingScoringSheet stage={stage} score={score} />;
            }
            return <HitCountScoringSheet stage={stage} score={score} />;
          case 'nrl22':
            return <HitCountScoringSheet stage={stage} score={score} />;
          // comstock, virginia, fixed_time, hit_factor, chrono — all use IPSC sheet
          default:
            return <IPSCScoringSheet stage={stage} score={score} />;
        }
      })()}
    </>
  );
}
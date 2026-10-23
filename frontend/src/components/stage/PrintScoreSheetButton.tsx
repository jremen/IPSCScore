import { Button } from 'flowbite-react';
import ScoreSheetCountModal from './ScoreSheetCountModal';
import { usePrintScoreSheetButton } from '../../hooks/usePrintScoreSheetButton';
import type { PrintScoreSheetButtonProps } from './types';

export default function PrintScoreSheetButton({ stages }: PrintScoreSheetButtonProps) {
  const { t, showModal, generating, openModal, closeModal, handleGenerate } =
    usePrintScoreSheetButton(stages);

  return (
    <>
      <Button
        size="sm"
        color="light"
        onClick={openModal}
        disabled={generating || stages.length === 0}
      >
        {generating ? '⏳' : '🖨'} {t('stages.printScoreSheets')}
      </Button>
      <ScoreSheetCountModal
        show={showModal}
        stages={stages}
        onClose={closeModal}
        onGenerate={handleGenerate}
      />
    </>
  );
}

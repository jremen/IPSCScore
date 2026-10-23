import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useScoreSheetCountModal } from '../../hooks/useScoreSheetCountModal';
import type { ScoreSheetCountModalProps } from './types';

export default function ScoreSheetCountModal({ show, stages, onClose, onGenerate }: ScoreSheetCountModalProps) {
  const { t, printableStages, generate } = useScoreSheetCountModal(stages, onGenerate);

  return (
    <Modal show={show} onClose={onClose} size="sm">
      <ModalHeader>{t('stages.printScoreSheets')}</ModalHeader>
      <ModalBody>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('stages.printSheetsDescription', { count: printableStages.length })}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button size="sm" color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button size="sm" onClick={generate} disabled={printableStages.length === 0}>
          {t('stages.printScoreSheets')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

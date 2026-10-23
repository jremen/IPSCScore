import { Modal, ModalHeader, ModalBody } from 'flowbite-react';
import { useStagePickerModal } from '../../hooks/useStagePickerModal';
import type { StagePickerModalProps } from './types';

export default function StagePickerModal({ show, onClose }: StagePickerModalProps) {
  const { t, stages, activeStageId, selectStage, stageScored } = useStagePickerModal(show, onClose);

  return (
    <Modal show={show} onClose={onClose} size="sm" dismissible>
      <ModalHeader>{t('auth.selectStage')}</ModalHeader>
      <ModalBody>
        <div className="space-y-1">
          {stages.map((stage) => {
            const isActive = stage.id === activeStageId;
            const scored = stageScored(stage.id);

            return (
              <button
                key={stage.id}
                onClick={() => selectStage(stage.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between
                  ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300 dark:ring-blue-700 text-blue-700 dark:text-blue-300 eink:bg-black! eink:text-white! eink:ring-2! eink:ring-black!'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white'
                  }`}
              >
                <span className="font-medium">
                  {t('scoring.stage', { number: stage.stage_number })}: {stage.name}
                </span>
                {scored && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-2.5 leading-none">✓</span>
                )}
                {isActive && !scored && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-2.5 leading-none">●</span>
                )}
              </button>
            );
          })}
        </div>
      </ModalBody>
    </Modal>
  );
}

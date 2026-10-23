import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useExportMatchModal } from '../../hooks/useExportMatchModal';
import type { ExportMatchModalProps } from './types';

export default function ExportMatchModal({ show, onClose, matchId, matchName }: ExportMatchModalProps) {
  const { t, exporting, local, exportNative, exportPsc } = useExportMatchModal(matchId, matchName, onClose);

  return (
    <Modal show={show} onClose={onClose} size="md" className="dark:text-white">
      <ModalHeader>{t('matches.exportModalTitle')}</ModalHeader>
      <ModalBody>
        <p className="mb-4">{t('matches.exportFormatChoice')}</p>
        <div className="grid grid-cols-1 gap-3">
          <Button
            color="light"
            onClick={exportNative}
            disabled={exporting}
            className="justify-start px-4! py-6!"
          >
            <div className="text-left">
              <div className="font-semibold">{t('matches.exportFormatNative')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                IPSCScore .match.json
              </div>
            </div>
          </Button>
          {!local && (
            <Button
              color="light"
              onClick={exportPsc}
              disabled={exporting}
              className="justify-start px-4! py-6!"
            >
              <div className="text-left">
                <div className="font-semibold">{t('matches.exportFormatPsc')}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Practiscore .psc
                </div>
              </div>
            </Button>
          )}
        </div>
        {exporting && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t('matches.exportingPsc')}
          </p>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>
          {t('common.cancel')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

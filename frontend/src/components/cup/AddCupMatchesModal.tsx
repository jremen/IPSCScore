import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import MatchPicker from './MatchPicker';
import { useAddCupMatchesModal } from '../../hooks/useAddCupMatchesModal';
import type { AddCupMatchesModalProps } from './types';

export default function AddCupMatchesModal({ show, onClose, cupId, existingIds }: AddCupMatchesModalProps) {
  const { t } = useTranslation();
  const { selected, saving, toggleMatch, handleSave } = useAddCupMatchesModal({ show, onClose, cupId });

  return (
    <Modal show={show} onClose={onClose} size="lg">
      <ModalHeader>{t('cups.addMatches')}</ModalHeader>
      <ModalBody>
        <p className="text-sm text-gray-500 mb-2">{t('cups.addMatchesHint')}</p>
        <MatchPicker selected={selected} onToggle={toggleMatch} excludeIds={new Set(existingIds)} />
      </ModalBody>
      <ModalFooter>
        <Button size="sm" color="green" onClick={handleSave} disabled={saving || selected.size === 0}>
          {saving ? t('common.loading') : t('cups.addMatches')}
        </Button>
        <Button size="sm" color="gray" onClick={onClose}>{t('common.cancel')}</Button>
      </ModalFooter>
    </Modal>
  );
}

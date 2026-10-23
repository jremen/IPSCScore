import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { TbTrash } from 'react-icons/tb';
import { useDeleteCupModal } from '../../hooks/useDeleteCupModal';
import type { DeleteCupModalProps } from './types';

export default function DeleteCupModal({ show, onClose, cupId }: DeleteCupModalProps) {
  const { t, cup, loading, handleDelete, handleClose } = useDeleteCupModal(cupId, onClose);

  return (
    <Modal show={show} onClose={handleClose} size="md">
      <ModalHeader>{t('cups.deleteTitle')}</ModalHeader>
      <ModalBody>
        <p className="dark:text-white">{t('cups.deleteConfirm', { name: cup?.name ?? '' })}</p>
        <p className="text-sm text-gray-500 mt-2">{t('cups.deleteNote')}</p>
      </ModalBody>
      <ModalFooter>
        <Button size="sm" color="red" onClick={handleDelete} disabled={loading}>
          <TbTrash className="size-4 mr-2" />
          {loading ? t('common.loading') : t('common.delete')}
        </Button>
        <Button size="sm" color="gray" onClick={handleClose}>{t('common.cancel')}</Button>
      </ModalFooter>
    </Modal>
  );
}

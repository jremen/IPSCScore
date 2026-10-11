import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useCupStore } from '../../stores/cupStore';
import { useUIStore } from '../../stores/uiStore';
import { useEscClose } from '../../hooks/useEscClose';
import { TbTrash } from 'react-icons/tb';

interface DeleteCupModalProps {
  show: boolean;
  onClose: () => void;
  cupId: string | null;
}

export default function DeleteCupModal({ show, onClose, cupId }: DeleteCupModalProps) {
  const { t } = useTranslation();
  const cups = useCupStore((s) => s.cups);
  const deleteCup = useCupStore((s) => s.deleteCup);
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);

  const cup = cups.find((c) => c.id === cupId);
  const handleClose = () => onClose();
  useEscClose(handleClose);

  const handleDelete = async () => {
    if (!cupId) return;
    setLoading(true);
    try {
      await deleteCup(cupId);
      addToast(t('cups.deleted'), 'success');
      handleClose();
    } catch (err: any) {
      addToast(err.message || t('common.unknownError'), 'error');
    } finally {
      setLoading(false);
    }
  };

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
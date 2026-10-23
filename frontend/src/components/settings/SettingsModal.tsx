import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import LanguageSelector from './LanguageSelector';
import DatabaseSettings from './DatabaseSettings';
import PowerSettings from './PowerSettings';
import AdminPasswordSection from './AdminPasswordSection';
import AuditLogModal from './AuditLogModal';
import { useSettingsModal } from '../../hooks/useSettingsModal';
import type { SettingsModalProps } from './types';

export default function SettingsModal({ show, onClose }: SettingsModalProps) {
  const { t, showAuditLog, openAuditLog, closeAuditLog } = useSettingsModal(onClose);

  return (
    <Modal show={show} onClose={onClose} size="7xl">
      <ModalHeader>{t('settings.title')}</ModalHeader>
      <ModalBody>
        <div className="lg:grid grid-cols-2 gap-12">
          <div>
            <h3 className="text-lg font-semibold dark:text-white mb-2">{t('settings.language')}</h3>
            <LanguageSelector />
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <AdminPasswordSection />
            </div>
          </div>

          <DatabaseSettings />
        </div>

        <PowerSettings />

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
          <h3 className="text-lg font-semibold dark:text-white mb-2">{t('settings.auditLog')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('settings.auditLogDescription')}</p>
          <Button size="sm" color="purple" onClick={openAuditLog}>
            📋 {t('settings.viewAuditLog')}
          </Button>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
      </ModalFooter>

      <AuditLogModal show={showAuditLog} onClose={closeAuditLog} />
    </Modal>
  );
}

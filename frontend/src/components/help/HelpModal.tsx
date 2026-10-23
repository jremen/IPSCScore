import { Modal, ModalHeader, ModalBody } from 'flowbite-react';
import HelpSidebar from './HelpSidebar';
import HelpContent from './HelpContent';
import { useHelpModal } from '../../hooks/useHelpModal';
import type { HelpModalProps } from './types';

export default function HelpModal({ show, onClose }: HelpModalProps) {
  const { t, isAdmin, sections, activeId, activeSection, setActiveId } = useHelpModal(show, onClose);

  return (
    <Modal show={show} onClose={onClose} size="7xl" dismissible>
      <ModalHeader>{t('help.title')}</ModalHeader>
      <ModalBody>
        <div className="flex flex-col sm:flex-row gap-0 sm:gap-4 -mx-2 sm:-mx-0">
          <HelpSidebar
            sections={sections}
            activeId={activeSection?.id ?? activeId}
            onSelect={setActiveId}
          />
          <div className="flex-1 min-w-0 sm:max-h-[70vh] sm:overflow-y-auto">
            {activeSection && (
              <HelpContent
                key={activeSection.id}
                section={activeSection}
                onNavigateSection={setActiveId}
              />
            )}
          </div>
        </div>
        {!isAdmin && (
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
            {t('help.adminOnly')}
          </p>
        )}
      </ModalBody>
    </Modal>
  );
}

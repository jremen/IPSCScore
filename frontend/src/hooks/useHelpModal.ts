import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { getVisibleHelpSections } from '../config/helpSections';
import { useEscClose } from './useEscClose';
import { FIRST_HELP_SECTION_ID } from '../utils/help';

export function useHelpModal(show: boolean, onClose: () => void) {
  const { t } = useTranslation();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const sections = useMemo(() => getVisibleHelpSections(isAdmin), [isAdmin]);
  const [activeId, setActiveId] = useState<string>(FIRST_HELP_SECTION_ID);

  useEffect(() => {
    if (!sections.find((section) => section.id === activeId)) {
      setActiveId(sections[0]?.id ?? FIRST_HELP_SECTION_ID);
    }
  }, [sections, activeId]);

  const activeSection = sections.find((section) => section.id === activeId) ?? sections[0];

  useEscClose(
    useCallback(() => {
      if (show) onClose();
    }, [onClose, show]),
  );

  return { t, isAdmin, sections, activeId, activeSection, setActiveId };
}

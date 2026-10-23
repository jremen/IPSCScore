import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEscClose } from './useEscClose';

export function useSettingsModal(onClose: () => void) {
  const { t } = useTranslation();
  const [showAuditLog, setShowAuditLog] = useState(false);
  useEscClose(onClose);

  const openAuditLog = useCallback(() => setShowAuditLog(true), []);
  const closeAuditLog = useCallback(() => setShowAuditLog(false), []);

  return { t, showAuditLog, openAuditLog, closeAuditLog };
}

import { Alert, Modal, ModalHeader, ModalBody, ModalFooter, Button, ToggleSwitch } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { BsCopy, BsCheckCircle, BsXCircle, BsTrash } from 'react-icons/bs';
import { useScorerTrustModal } from '../../hooks/useScorerTrustModal';
import type { ScorerTrustModalProps } from './types';

export default function ScorerTrustModal({ show, onClose }: ScorerTrustModalProps) {
  const { t } = useTranslation();
  const {
    loading,
    error,
    qr,
    qrUrl,
    copied,
    sessions,
    pendingSessions,
    activeSessions,
    deviceMode,
    settingMode,
    rotating,
    cleaningUp,
    cleanupResult,
    handleModeToggle,
    handleRotate,
    handleApprove,
    handleRevoke,
    handleCleanupDuplicates,
    handleCopyUrl,
  } = useScorerTrustModal({ show, onClose });

  return (
    <Modal show={show} onClose={onClose} size="5xl" dismissible>
      <ModalHeader>{t('auth.trustTitle')}</ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
        ) : (
          <div className="lg:flex gap-8">
            <div className="lg:w-1/2 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('auth.trustDescription')}</p>

              {error && <Alert color="failure">{error}</Alert>}

              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('auth.trustDeviceModeLabel')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {deviceMode === 'silent' ? t('auth.trustDeviceModeSilent') : t('auth.trustDeviceModePending')}
                  </p>
                </div>
                <ToggleSwitch
                  checked={deviceMode === 'pending'}
                  onChange={handleModeToggle}
                  disabled={settingMode}
                  label=""
                />
              </div>

              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl shadow-lg inline-block">
                  {qr ? (
                    <img src={qr} alt="QR" className="size-64 md:size-72" />
                  ) : (
                    <div className="size-64 md:size-72 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <code className="text-xs bg-gray-100 dark:text-white dark:bg-gray-800 px-2 py-1 rounded break-all max-w-md">
                  {qrUrl}
                </code>
                <button
                  onClick={handleCopyUrl}
                  className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                  title={t('header.copyUrl')}
                >
                  {copied ? <BsCheckCircle className="size-4 text-green-500" /> : <BsCopy className="size-4" />}
                </button>
              </div>
            </div>

            <div className="dark:text-white max-lg:mt-4 lg:w-1/2">
              <h3 className="text-lg font-medium mb-4">
                {t('auth.trustActiveSessions')} ({sessions.length})
              </h3>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {sessions.length === 0 ? (
                  <p className="text-xs text-gray-500">{t('auth.trustNoSessions')}</p>
                ) : (
                  <>
                    {pendingSessions.length > 0 && (
                      <div className="space-y-1 mb-2">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 px-1">
                          {t('auth.trustPending')} ({pendingSessions.length})
                        </p>
                        {pendingSessions.map((session) => (
                          <div key={session.id} className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                            <div className="flex flex-col min-w-0">
                              <span className="dark:text-white truncate">{session.device_label || t('auth.trustUnknownDevice')}</span>
                              {session.device_id && <span className="text-gray-400 text-base font-mono">{t('auth.trustDeviceId')}:&nbsp;{session.device_id.slice(0, 8)}…</span>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="xs" color="blue" onClick={() => handleApprove(session.id)}>
                                {t('auth.trustApprove')}
                              </Button>
                              <Button size="xs" color="red" onClick={() => handleRevoke(session.id, session.device_label)}>
                                <BsXCircle className="size-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {activeSessions.length > 0 && (
                      <div className="space-y-1">
                        {activeSessions.map((session) => (
                          <div key={session.id} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            <div className="flex flex-col min-w-0">
                              <span className="dark:text-white truncate">{session.device_label || t('auth.trustUnknownDevice')}</span>
                              {session.device_id && <span className="text-gray-400 text-base font-mono">{t('auth.trustDeviceId')}:&nbsp;{session.device_id.slice(0, 8)}…</span>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-gray-500">{new Date(session.last_used_at).toLocaleString()}</span>
                              <Button size="xs" color="red" onClick={() => handleRevoke(session.id, session.device_label)}>
                                <BsXCircle className="size-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {sessions.length > 1 && (
                      <div className="pt-2 flex items-center gap-2">
                        <Button size="xs" color="gray" onClick={handleCleanupDuplicates} disabled={cleaningUp}>
                          <BsTrash className="size-3 mr-1" />
                          {cleaningUp ? t('common.loading') : t('auth.trustCleanupDuplicates')}
                        </Button>
                        {cleanupResult !== null && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {t('auth.trustCleanupResult', { count: cleanupResult })}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter className="flex justify-between">
        <Button color="red" onClick={handleRotate} disabled={rotating}>
          {rotating ? t('common.loading') : t('auth.trustRotate')}
        </Button>
        <Button color="gray" onClick={onClose}>{t('common.close')}</Button>
      </ModalFooter>
    </Modal>
  );
}

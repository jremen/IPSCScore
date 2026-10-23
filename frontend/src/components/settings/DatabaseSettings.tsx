import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Alert, ToggleSwitch, Spinner, Label } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useDatabaseSettings } from '../../hooks/useDatabaseSettings';

export default function DatabaseSettings() {
  const { t } = useTranslation();
  const {
    isElectron,
    local,
    fileInputRef,
    selectedFile,
    showConfirm,
    backupFolder,
    backupEnabled,
    lastFull,
    deltasSinceFull,
    diskUsage,
    triggering,
    message,
    folderAccessible,
    showRestoreConfirm,
    restorePreview,
    restoring,
    exporting,
    importing,
    handleExport,
    handleImportClick,
    handleFileSelect,
    confirmImport,
    cancelImport,
    pickBackupFolder,
    handleBackupNow,
    handleToggle,
    handleRestoreFolder,
    confirmRestore,
    cancelRestore,
    formatBytes,
  } = useDatabaseSettings();

  return (
    <div className="relative border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex flex-col h-full space-y-4">
        {(importing || exporting) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-gray-800/50 dark:text-white">
            <Spinner size="lg" />
            <h3 className="text-xl">
              {importing ? t('database.importing') : t('database.exporting')}
            </h3>
            <p className="text-sm text-gray-200">{t('database.busyWait')}</p>
          </div>
        )}
        <h3 className="text-lg font-semibold dark:text-white">{t('database.title')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {local ? t('database.descriptionLocal') : t('database.description')}
        </p>

        <div className="flex gap-3 flex-wrap">
          <Button size="sm" color="blue" onClick={handleExport} disabled={exporting || importing}>
            {exporting ? t('database.exporting') : `📥 ${local ? t('database.exportJson') : t('database.export')}`}
          </Button>
          <Button size="sm" color="green" onClick={handleImportClick} disabled={exporting || importing}>
            {importing ? t('database.importing') : `📤 ${local ? t('database.importJson') : t('database.import')}`}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={local ? '.json' : '.sql'}
          className="hidden"
          onChange={handleFileSelect}
        />

        <Modal show={showConfirm} onClose={cancelImport} size="md" popup>
          <ModalHeader>{t('database.importConfirm')}</ModalHeader>
          <ModalBody>
            <Alert color="failure" className="mb-3">
              <p className="font-medium">{t('database.importWarning')}</p>
            </Alert>
            {selectedFile && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('database.file')} <span className="font-mono font-medium">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="gray" onClick={cancelImport} disabled={importing}>
              {t('common.cancel')}
            </Button>
            <Button color="red" onClick={confirmImport} disabled={importing}>
              {importing ? t('database.importing') : t('database.confirmButton')}
            </Button>
          </ModalFooter>
        </Modal>

        {isElectron && (
          <div className="relative border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
            <h3 className="text-lg font-semibold dark:text-white">{t('localBackup.title')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('localBackup.description')}</p>

            <div className="space-y-3">
              {backupFolder ? (
                <div className="flex items-center gap-2 text-sm dark:text-white">
                  <span className="text-blue-600 dark:text-blue-400">📁</span>
                  <span className="font-mono truncate">{backupFolder}</span>
                  <Button size="xs" color="gray" onClick={pickBackupFolder}>
                    {t('localBackup.changeFolder')}
                  </Button>
                </div>
              ) : (
                <Button size="sm" color="blue" onClick={pickBackupFolder}>
                  {t('localBackup.pickFolder')}
                </Button>
              )}

              {backupFolder && (
                <div className="text-sm space-y-1 p-3 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-lg">
                  <Label htmlFor="backup" className="cursor-pointer flex items-center gap-3">
                    <ToggleSwitch
                      checked={backupEnabled}
                      onChange={handleToggle}
                      disabled={!folderAccessible}
                      id="backup"
                    />
                    <span>{backupEnabled ? t('localBackup.enabled') : t('localBackup.disabled')}</span>
                  </Label>
                  {!folderAccessible && (
                    <Alert color="warning" className="mt-2">
                      <p className="text-sm font-medium">{t('localBackup.folderNotAccessible')}</p>
                    </Alert>
                  )}
                  <p>
                    <span className="font-medium">{t('localBackup.lastFull')}:</span>{' '}
                    {lastFull ? new Date(lastFull).toLocaleString() : t('localBackup.never')}
                  </p>
                  <p>
                    <span className="font-medium">{t('localBackup.deltas')}:</span> {deltasSinceFull}
                  </p>
                  <p>
                    <span className="font-medium">{t('localBackup.diskUsage')}:</span> {formatBytes(diskUsage)}
                  </p>
                </div>
              )}

              {backupFolder && (
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" color="purple" onClick={handleBackupNow} disabled={restoring || triggering}>
                    {triggering ? '...' : t('localBackup.backupNow')}
                  </Button>
                  <Button size="sm" color="red" onClick={handleRestoreFolder} disabled={restoring}>
                    {restoring ? '...' : t('localBackup.restore')}
                  </Button>
                </div>
              )}

              {message && <p className="text-sm text-blue-600 dark:text-blue-400">{message}</p>}
            </div>

            <Modal show={showRestoreConfirm} onClose={cancelRestore} size="md" popup>
              <ModalHeader>{t('localBackup.restoreConfirm')}</ModalHeader>
              <ModalBody>
                <Alert color="failure" className="mb-3">
                  <p className="font-medium">{t('localBackup.restoreWarning')}</p>
                </Alert>
                {restorePreview && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>{t('localBackup.restoreFrom')} <span className="font-mono font-medium">{restorePreview.folder}</span></p>
                    <p>{t('localBackup.restoreSummary', {
                      file: restorePreview.fullFile,
                      size: formatBytes(restorePreview.fullSize),
                      deltas: restorePreview.deltasCount,
                      earliest: restorePreview.deltaDates.earliest
                        ? new Date(restorePreview.deltaDates.earliest).toLocaleString()
                        : t('localBackup.never'),
                      latest: restorePreview.deltaDates.latest
                        ? new Date(restorePreview.deltaDates.latest).toLocaleString()
                        : t('localBackup.never'),
                    })}</p>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="gray" onClick={cancelRestore} disabled={restoring}>
                  {t('common.cancel')}
                </Button>
                <Button color="red" onClick={confirmRestore} disabled={restoring}>
                  {restoring ? '...' : t('localBackup.restoreConfirm')}
                </Button>
              </ModalFooter>
            </Modal>
            {restoring && (
              <div className="absolute flex top-0 left-0 z-1 size-full bg-gray-800/50 rounded-lg pt-4 flex-col gap-4 items-center justify-center dark:text-white">
                <Spinner size="lg" />
                <h3 className="text-xl">{t('localBackup.restoring')}</h3>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

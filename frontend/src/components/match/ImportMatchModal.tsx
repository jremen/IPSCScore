import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Spinner, Alert, Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import FileDropzone from './FileDropzone';
import { useImportMatchModal } from '../../hooks/useImportMatchModal';
import type { ImportMatchModalProps } from './types';

export default function ImportMatchModal({ show, onClose, onImported }: ImportMatchModalProps) {
  const { t } = useTranslation();
  const {
    local,
    importing,
    activeTab,
    setActiveTab,
    selectedFile,
    pscFile,
    error,
    winmssImporting,
    winmssInspecting,
    winmssResult,
    winmssInspectData,
    winmssError,
    winmssDropzone,
    tabItems,
    handleClose,
    handleJsonFileSelected,
    handlePscFileSelected,
    handleJsonConfirm,
    handlePscConfirm,
    handleWinMssImport,
    handleWinMssInspect,
    handleWinmssInspectBack,
    handleWinmssImportAnother,
  } = useImportMatchModal({ onClose, onImported });

  return (
    <Modal show={show} onClose={handleClose} size="xl" className="dark:text-white">
      <ModalHeader>{t('matches.importMatch')}</ModalHeader>
      <ModalBody>
        <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
          {tabItems.map((tab) => (
            <button key={tab.id} className={tab.className} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'json' && (
          <div>
            <p className="mb-3">{t('matches.importMatchDescription')}</p>
            <FileDropzone
              accept={{ 'application/json': ['.json'] }}
              onFileSelected={handleJsonFileSelected}
              disabled={importing}
              dropHint={t('matches.import.json.dropHere')}
              dragHint={t('matches.import.json.dragDrop')}
              browseHint={t('matches.import.json.orBrowse')}
            />
            {selectedFile && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{selectedFile.name}</p>}
            {error && <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>}
            <p className="text-sm text-red-600 mt-3 font-medium">{t('common.cannotBeUndone')}</p>
          </div>
        )}

        {activeTab === 'winmss' && (
          <div>
            {!winmssImporting && !winmssInspecting && !winmssResult && !winmssInspectData && !winmssError && (
              <>
                {local && (
                  <Alert color="info" className="mb-3">
                    <p className="text-sm">{t('import.winMss.mobileCabOnly')}</p>
                  </Alert>
                )}
                <FileDropzone
                  accept={winmssDropzone.accept}
                  onFileSelected={handleWinMssImport}
                  disabled={winmssImporting || winmssInspecting}
                  dropHint={t('import.winMss.dropHere')}
                  dragHint={winmssDropzone.dragHint}
                  browseHint={winmssDropzone.browseHint}
                  extraButton={{ label: t('import.winMss.inspectButton'), onClick: handleWinMssInspect }}
                />
              </>
            )}

            {winmssImporting && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Spinner size="xl" />
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('import.winMss.importing')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('import.winMss.importingWait')}</p>
              </div>
            )}

            {winmssInspecting && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Spinner size="xl" />
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('import.winMss.inspecting')}</p>
              </div>
            )}

            {winmssInspectData && (
              <div className="space-y-4 max-h-[40vh] overflow-y-auto">
                <Alert color="info">
                  <p className="font-medium">{t('import.winMss.inspectionTitle')}</p>
                  <p className="text-sm mt-1">{t('import.winMss.inspectionDescription')}</p>
                  {winmssInspectData.format === 'cab' && winmssInspectData.files && (
                    <p className="text-xs mt-2 font-mono break-all">
                      {t('import.winMss.cabFiles', { files: winmssInspectData.files.join(', ') })}
                    </p>
                  )}
                  {winmssInspectData.warnings && winmssInspectData.warnings.length > 0 && (
                    <ul className="text-xs mt-2 list-disc pl-4">
                      {winmssInspectData.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  )}
                </Alert>
                {Object.entries(winmssInspectData.tables || {}).map(([tableName, tableData]) => (
                  <div key={tableName} className="border rounded-lg p-3 dark:border-gray-600">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">{tableName}</h4>
                    <p className="text-sm text-gray-500">{tableData.rowCount} {t('import.winMss.rows')}</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      {t('import.winMss.columns')} {tableData.columns?.join(', ')}
                    </p>
                    {tableData.sampleRows && tableData.sampleRows.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-500 cursor-pointer">{t('import.winMss.showSample')}</summary>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(tableData.sampleRows[0], null, 2)}
                        </pre>
                      </details>
                    )}
                    {tableData.error && (
                      <p className="text-xs text-red-500 mt-1">{t('import.winMss.tableError', { message: tableData.error })}</p>
                    )}
                  </div>
                ))}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" color="gray" onClick={handleWinmssInspectBack}>{t('common.back')}</Button>
                  <Button size="sm" color="blue" onClick={handleWinmssInspectBack}>{t('import.winMss.importFile')}</Button>
                </div>
              </div>
            )}

            {winmssError && (
              <div className="space-y-4 max-h-[40vh] overflow-y-auto">
                <Alert color="failure">
                  <p className="font-medium">{t('import.winMss.importFailed')}</p>
                  <p className="text-sm mt-1">{winmssError}</p>
                </Alert>
                <FileDropzone
                  accept={winmssDropzone.accept}
                  onFileSelected={handleWinMssImport}
                  disabled={winmssImporting || winmssInspecting}
                  dropHint={t('import.winMss.dropHere')}
                  dragHint={winmssDropzone.dragHint}
                  browseHint={t('import.winMss.tryAgain')}
                />
              </div>
            )}

            {winmssResult && (
              <div className="space-y-4 max-h-[40vh] overflow-y-auto">
                <Alert color={winmssResult.scores.created > 0 ? 'success' : 'warning'}>
                  <p className="font-medium">
                    {winmssResult.scores.created > 0 ? t('import.winMss.importCompleted') : t('import.winMss.importNoScores')}
                  </p>
                  {winmssResult.scores.created === 0 && winmssResult.scores.errors.length > 0 && (
                    <p className="text-sm mt-1">{t('import.winMss.checkErrors')}</p>
                  )}
                </Alert>

                {winmssResult.matches.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      {winmssResult.matches.length > 1 ? t('import.winMss.matches') : t('import.winMss.match')} ({winmssResult.matches.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {winmssResult.matches.map((match, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded text-sm ${match.updated ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}
                        >
                          {match.name}{match.date ? ` — ${new Date(match.date).toLocaleDateString()}` : ''}{match.updated ? ` ${t('import.winMss.updated')}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Table striped>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>{t('import.winMss.categoryCol')}</TableHeadCell>
                      <TableHeadCell>{t('import.winMss.createdCol')}</TableHeadCell>
                      <TableHeadCell>{t('import.winMss.skippedCol')}</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>{t('import.winMss.stagesRow')}</TableCell>
                      <TableCell>{winmssResult.stages.filter((stage) => !stage.updated).length}</TableCell>
                      <TableCell>{winmssResult.stages.filter((stage) => stage.updated).length} {t('import.winMss.updated')}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t('import.winMss.shootersRow')}</TableCell>
                      <TableCell>{winmssResult.shooters.created}</TableCell>
                      <TableCell>{winmssResult.shooters.skipped}{winmssResult.shooters.errors.length > 0 ? ` ${t('import.winMss.errorsCount', { count: winmssResult.shooters.errors.length })}` : ''}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t('import.winMss.registrationsRow')}</TableCell>
                      <TableCell>{winmssResult.registrations.created}</TableCell>
                      <TableCell>{winmssResult.registrations.skipped}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t('import.winMss.scoresRow')}</TableCell>
                      <TableCell>{winmssResult.scores.created}</TableCell>
                      <TableCell>{winmssResult.scores.errors.length} {t('import.winMss.errorsWord')}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {winmssResult.warnings.length > 0 && (
                  <Alert color="warning">
                    <p className="font-medium mb-1">{t('import.winMss.warnings')}</p>
                    <ul className="list-disc list-inside text-sm">
                      {winmssResult.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                    </ul>
                  </Alert>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'psc' && (
          <div>
            <p className="mb-3">{t('matches.import.psc.description')}</p>
            <FileDropzone
              accept={{
                'application/zip': ['.psc'],
                'application/octet-stream': ['.psc'],
              }}
              onFileSelected={handlePscFileSelected}
              disabled={importing}
              dropHint={t('matches.import.psc.dropHere')}
              dragHint={t('matches.import.psc.dragDrop')}
              browseHint={t('matches.import.psc.orBrowse')}
            />
            {pscFile && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{pscFile.name}</p>}
            {error && activeTab === 'psc' && <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>}
            <p className="text-sm text-red-600 mt-3 font-medium">{t('common.cannotBeUndone')}</p>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={handleClose}>
          {winmssResult || winmssInspectData ? t('common.close') : t('common.cancel')}
        </Button>

        {activeTab === 'json' && (
          <Button color="red" onClick={handleJsonConfirm} disabled={!selectedFile || importing}>
            {importing ? t('matches.importing') : t('matches.importMatch')}
          </Button>
        )}

        {activeTab === 'psc' && (
          <Button color="red" onClick={handlePscConfirm} disabled={!pscFile || importing}>
            {importing ? t('matches.importing') : t('matches.importMatch')}
          </Button>
        )}

        {activeTab === 'winmss' && winmssResult && (
          <Button color="blue" onClick={handleWinmssImportAnother}>{t('import.winMss.importAnother')}</Button>
        )}
      </ModalFooter>
    </Modal>
  );
}

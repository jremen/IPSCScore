import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Alert, Select, Label, Checkbox } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useCsvImportModal } from '../../hooks/useCsvImportModal';
import type { CsvImportModalProps } from './types';

export default function CSVImportModal({ show, onClose, type, matchId, onImportComplete }: CsvImportModalProps) {
  const { t } = useTranslation();
  const {
    result,
    importing,
    selectedFile,
    hasHeader,
    updateExisting,
    csvHeaders,
    columnMapping,
    step,
    columns,
    mappedRequiredFields,
    getRootProps,
    getInputProps,
    open,
    handleImport,
    handleReset,
    handleBack,
    handleMappingChange,
    handleHasHeaderChange,
    handleUpdateExistingChange,
    downloadSample,
  } = useCsvImportModal({ type, matchId, onClose, onImportComplete });

  return (
    <Modal show={show} onClose={handleReset} size="xl">
      <ModalHeader>{t('import.modalTitle', { entity: t(`import.entity.${type}`) })}</ModalHeader>
      <ModalBody>
        {step === 'upload' && (
          <>
            <div {...getRootProps()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center mb-4">
              <input {...getInputProps()} />
              <p className="text-gray-500 mb-2">📂 {t('import.dragDrop')}</p>
              <Button size="sm" color="blue" onClick={open}>{t('import.selectFile')}</Button>
            </div>
            <Button size="xs" color="gray" onClick={downloadSample} className="mb-3">{t('import.downloadSample')}</Button>
          </>
        )}

        {step === 'mapping' && (
          <>
            <div className="mb-4 p-3 bg-blue-50 dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>{t('import.file')}</strong> {selectedFile?.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>{t('import.detectedColumns')}</strong> {csvHeaders.length > 0 ? csvHeaders.join(', ') : 'None'}
              </p>
            </div>

            <div className="mb-4">
              <Checkbox
                className="size-5 cursor-pointer"
                checked={hasHeader}
                onChange={(e) => handleHasHeaderChange(e.target.checked)}
              />
              <Label className="ml-2 text-sm">{t('import.firstRowHeader')}</Label>
            </div>

            {type === 'shooters' && (
              <div className="mb-4">
                <Checkbox
                  className="size-5 cursor-pointer"
                  checked={updateExisting}
                  onChange={(e) => handleUpdateExistingChange(e.target.checked)}
                />
                <Label className="ml-2 text-sm">{t('import.updateExisting')}</Label>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-semibold dark:text-white text-sm">{t('import.mapColumns')}</h4>
              {columns.map((column) => (
                <div key={column.key} className="flex items-center gap-3">
                  <div className="w-48 text-right">
                    <Label className="text-sm">
                      {t(column.labelKey)}
                      {column.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                  </div>
                  <Select
                    value={columnMapping[column.key] || ''}
                    onChange={(e) => handleMappingChange(column.key, e.target.value)}
                    className="flex-1"
                  >
                    <option value="">{t('import.skip')}</option>
                    {csvHeaders.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>

            {!mappedRequiredFields && (
              <Alert color="warning" className="mt-3">{t('import.validationMessage')}</Alert>
            )}
          </>
        )}

        {step === 'result' && result && (
          <Alert color={result.errors.length > 0 ? 'warning' : 'success'}>
            <p className="font-semibold">{t('import.importComplete')}</p>
            <p>
              {t('import.imported')}: {result.imported}
              {result.updated !== undefined && <> | {t('import.updated')}: {result.updated}</>} | {t('import.skipped')}: {result.skipped}
            </p>
            {result.errors.length > 0 && (
              <ul className="text-xs mt-1 list-disc list-inside">
                {result.errors.slice(0, 10).map((error, index) => <li key={index}>{error}</li>)}
                {result.errors.length > 10 && <li>{t('import.moreErrors', { count: result.errors.length - 10 })}</li>}
              </ul>
            )}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 'mapping' && (
          <>
            <Button color="gray" onClick={handleBack}>{t('common.back')}</Button>
            <Button color="blue" onClick={handleImport} disabled={!mappedRequiredFields || importing}>
              {importing ? t('import.importing') : t('common.create')}
            </Button>
          </>
        )}
        {step === 'result' && <Button color="blue" onClick={handleReset}>{t('import.done')}</Button>}
        {step === 'upload' && <Button color="gray" onClick={handleReset}>{t('common.cancel')}</Button>}
      </ModalFooter>
    </Modal>
  );
}

import { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useEscClose } from './useEscClose';
import {
  CSV_COLUMN_DEFINITIONS,
  buildCsvColumnMapping,
  downloadCsvSample,
  parseCsvHeaders,
} from '../utils/csvImport';
import type { CSVImportResult } from '../types/results';

interface Options {
  type: 'shooters' | 'registrations' | 'scores';
  matchId?: string;
  onClose: () => void;
  onImportComplete?: () => void;
}

export function useCsvImportModal({ type, matchId, onClose, onImportComplete }: Options) {
  const addToast = useUIStore((s) => s.addToast);
  const { t } = useTranslation();
  const [result, setResult] = useState<CSVImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'mapping' | 'result'>('upload');

  const columns = CSV_COLUMN_DEFINITIONS[type] || [];

  const parseHeaders = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const headers = parseCsvHeaders(text);
      setCsvHeaders(headers);
      setColumnMapping(buildCsvColumnMapping(headers, columns));
      setStep('mapping');
    };
    reader.readAsText(file);
  }, [columns]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setSelectedFile(file);
    setResult(null);
    parseHeaders(file);
  }, [parseHeaders]);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { 'text/csv': [], 'application/vnd.ms-excel': [], 'text/plain': [] },
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
  });

  const handleImport = useCallback(async () => {
    if (!selectedFile) return;
    setImporting(true);
    try {
      let response: CSVImportResult;
      if (type === 'shooters') {
        response = await api.importShooters(selectedFile, {
          hasHeader,
          columnMapping,
          updateIfExists: updateExisting,
        });
      } else if (type === 'registrations' && matchId) {
        response = await api.importRegistrations(matchId, selectedFile, { hasHeader, columnMapping });
      } else if (type === 'scores' && matchId) {
        response = await api.importScores(matchId, selectedFile, { hasHeader, columnMapping });
      } else {
        throw new Error(t('csvImport.missingMatchId'));
      }
      setResult(response);
      setStep('result');
      const toastMessage = response.updated
        ? `${t('import.importedCount', { count: response.imported })} / ${t('import.updatedCount', { count: response.updated })}`
        : t('import.importedCount', { count: response.imported });
      addToast(toastMessage, 'success');
      onImportComplete?.();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setImporting(false);
    }
  }, [addToast, columnMapping, hasHeader, matchId, onImportComplete, selectedFile, t, type, updateExisting]);

  const resetImport = useCallback(() => {
    setResult(null);
    setSelectedFile(null);
    setCsvHeaders([]);
    setColumnMapping({});
    setStep('upload');
  }, []);

  const handleReset = useCallback(() => {
    onClose();
    resetImport();
  }, [onClose, resetImport]);

  useEscClose(handleReset);

  const handleBack = useCallback(() => {
    setStep('upload');
    setSelectedFile(null);
    setCsvHeaders([]);
    setColumnMapping({});
  }, []);

  const handleMappingChange = useCallback((key: string, value: string) => {
    setColumnMapping((previous) => ({ ...previous, [key]: value }));
  }, []);

  const handleHasHeaderChange = useCallback((checked: boolean) => setHasHeader(checked), []);
  const handleUpdateExistingChange = useCallback((checked: boolean) => setUpdateExisting(checked), []);

  const mappedRequiredFields = useMemo(
    () => columns.filter((column) => column.required).every((column) => columnMapping[column.key]),
    [columnMapping, columns],
  );

  const downloadSample = useCallback(() => downloadCsvSample(type), [type]);

  return {
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
  };
}

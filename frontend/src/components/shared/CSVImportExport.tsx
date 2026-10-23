import { Button } from 'flowbite-react';
import CSVImportModal from './CSVImportModal';
import { TbFileImport, TbFileExport } from 'react-icons/tb';
import { useCsvImportExport } from '../../hooks/useCsvImportExport';
import type { CsvImportExportProps } from './types';

export default function CSVImportExport({ type, matchId, onImportComplete }: CsvImportExportProps) {
  const { t, local, show, exporting, open, close, exportShooters, exportRegistrations } =
    useCsvImportExport({ type, matchId });

  if (local) return null;

  return (
    <>
      <Button size="sm" color="light" onClick={open}>
        <TbFileImport className="mr-2 size-4" />
        {t('common.import')}
      </Button>
      {type === 'shooters' && (
        <Button size="sm" color="light" onClick={exportShooters} disabled={exporting}>
          <TbFileExport className="mr-2 size-4" />
          {exporting ? t('import.exporting') : t('common.export')}
        </Button>
      )}
      {type === 'registrations' && matchId && (
        <Button size="sm" color="light" onClick={exportRegistrations} disabled={exporting}>
          <TbFileExport className="mr-2 size-4" />
          {exporting ? t('import.exporting') : t('common.export')}
        </Button>
      )}
      <CSVImportModal show={show} onClose={close} type={type} matchId={matchId} onImportComplete={onImportComplete} />
    </>
  );
}

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../stores/matchStore';
import { useUIStore } from '../stores/uiStore';
import { generateScoreSheetPdf } from '../utils/scoreSheetPdf';
import { nativeSaveAs, saveBlobToDevice } from '../utils/exportUtils';
import { useTabMenuAction } from './useTabMenuAction';
import type { Stage } from '../types/stage';

export function usePrintScoreSheetButton(stages: Stage[]) {
  const { t } = useTranslation();
  const matches = useMatchStore((s) => s.matches);
  const activeMatchId = useUIStore((s) => s.activeMatchId);
  const addToast = useUIStore((s) => s.addToast);
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  useTabMenuAction('print-score-sheets', () => {
    if (stages.length > 0) setShowModal(true);
  });

  const activeMatch = matches?.find((match: any) => match.id === activeMatchId);

  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => setShowModal(false), []);

  const handleGenerate = useCallback(async () => {
    if (!activeMatch || !activeMatchId) return;
    setGenerating(true);
    setShowModal(false);

    try {
      const matchName = activeMatch.name || 'Match';
      const matchDate = activeMatch.date
        ? new Date(activeMatch.date).toLocaleDateString(document.documentElement.lang || 'en', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '';
      const organization = activeMatch.organization || '';

      const doc = await generateScoreSheetPdf({
        matchName,
        matchDate,
        organization,
        stages,
        sheetCount: 1,
      });

      const baseName = matchName.replace(/[^a-zA-Z0-9]/g, '_');
      const pdfBlob = doc.output('blob');
      const defaultName = `${baseName}_score_sheets.pdf`;

      const pickedFile = await nativeSaveAs(pdfBlob, defaultName, [
        { description: 'PDF file', accept: { 'application/pdf': ['.pdf'] } },
      ]);

      const saved = pickedFile || (await saveBlobToDevice(pdfBlob, defaultName));
      addToast(t(saved ? 'stages.pdfGenerated' : 'results.exportFailed'), saved ? 'success' : 'error');
    } catch (err: any) {
      console.error('Score sheet PDF error:', err);
      addToast(err.message || 'PDF generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  }, [activeMatch, activeMatchId, stages, addToast, t]);

  return { t, showModal, generating, openModal, closeModal, handleGenerate };
}

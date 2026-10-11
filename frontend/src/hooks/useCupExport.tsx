import { useCallback, useState } from "react";
import { useCupStore } from "../stores/cupStore";
import { useUIStore } from "../stores/uiStore";
import { categoryLabel, divisionLabel } from "../utils/constants";
import { formatHitFactor } from "../utils/hitFactor";
import { nativeSaveAs, downloadBlob, formatDateLong, MARGIN, TITLE_SIZE, SUBTITLE_SIZE, TABLE_STYLE } from "../utils/exportUtils";
import { loadPdfFonts, setBoldFont, setRegularFont } from "../utils/pdfFont";
import { triggerPrint } from "../utils/print";
import { useTranslation } from "react-i18next";
import type { CupResultRow, CupResultsPayload } from "../types/cup";

export type CupTab = 'byDivision' | 'overall' | 'byCategory' | 'byTag';

interface SaveProps { open: boolean; filename: string; blob: Blob; extension: string }

const TAB_SUFFIX: Record<CupTab, string> = {
  byDivision: 'by_division',
  overall: 'overall',
  byCategory: 'by_category',
  byTag: 'by_tag',
};

interface CupExportSection {
  title: string;
  subtitle?: string;
  head: string[];
  rows: (string | undefined)[][];
}

function rowCells(r: CupResultRow, hasDivision: boolean, mode: 'hit_factor' | 'points'): (string | undefined)[] {
  const score = mode === 'hit_factor' ? formatHitFactor(r.hit_factor, '—') : r.match_points?.toFixed(2);
  return [
    String(r.position),
    `${r.first_name} ${r.last_name}`,
    ...(hasDivision ? [divisionLabel(r.division)] : []),
    `${r.matches_count}/${r.matches_required}`,
    r.time != null ? r.time.toFixed(2) : '—',
    String(r.alpha),
    String(r.charlie),
    String(r.delta),
    String(r.miss),
    String(r.no_shoot),
    String(r.procedurals),
    `${Number(r.match_percent).toFixed(2)}%`,
    score,
  ];
}

function buildSections(tab: CupTab, payload: CupResultsPayload | null, t: (key: string, opts?: any) => string): CupExportSection[] {
  if (!payload) return [];
  const mode = payload.scoring_mode;
  const hasDivision = tab === 'byDivision' || tab === 'overall';
  const scoreHeader = mode === 'hit_factor' ? 'HF' : t('results.points');
  const head = [
    t('results.position'),
    t('results.shooter'),
    ...(hasDivision ? [t('results.division')] : []),
    t('cups.colMatches'),
    t('results.time'),
    t('results.alpha'),
    t('results.charlie'),
    t('results.delta'),
    t('results.miss'),
    t('results.noShootHits'),
    t('results.proceduralsHeader'),
    t('results.matchPercent'),
    scoreHeader,
  ];

  const sections: CupExportSection[] = [];

  if (tab === 'byDivision') {
    for (const [division, rows] of Object.entries(payload.results.byDivision).sort(([a], [b]) => a.localeCompare(b))) {
      sections.push({ title: divisionLabel(division), head, rows: rows.map((r) => rowCells(r, true, mode)) });
    }
  } else if (tab === 'overall') {
    sections.push({ title: t('results.overall'), head, rows: payload.results.overall.map((r) => rowCells(r, true, mode)) });
  } else if (tab === 'byCategory') {
    for (const [cat, divisions] of Object.entries(payload.results.byCategory)
      .filter(([cat]) => cat !== 'regular')
      .sort(([a], [b]) => a.localeCompare(b))) {
      for (const [division, rows] of Object.entries(divisions).sort(([a], [b]) => a.localeCompare(b))) {
        sections.push({
          title: categoryLabel(cat),
          subtitle: divisionLabel(division),
          head,
          rows: rows.map((r) => rowCells(r, false, mode)),
        });
      }
    }
  } else {
    for (const [tag, divisions] of Object.entries(payload.results.byTag).sort(([a], [b]) => a.localeCompare(b))) {
      for (const [division, rows] of Object.entries(divisions).sort(([a], [b]) => a.localeCompare(b))) {
        sections.push({ title: tag, subtitle: divisionLabel(division), head, rows: rows.map((r) => rowCells(r, false, mode)) });
      }
    }
  }

  return sections;
}

const useCupExport = (activeTab: CupTab) => {
  const { t } = useTranslation();
  const [saveModal, setSaveModal] = useState<SaveProps | null>(null);
  const addToast = useUIStore((s) => s.addToast);
  const results = useCupStore((s) => s.results);

  const cupName = results?.cup?.name || 'Cup';
  const baseName = cupName.replace(/[^a-zA-Z0-9]/g, '_');
  const tabSuffix = TAB_SUFFIX[activeTab];

  const handlePrint = useCallback(() => { triggerPrint(); }, []);

  const showSaveDialog = useCallback(async (blob: Blob, defaultName: string, extension: string, types: { description: string; accept: Record<string, string[]> }[], successKey: string) => {
    const nativeOk = await nativeSaveAs(blob, defaultName, types);
    if (nativeOk) {
      addToast(t(successKey), 'success');
      return;
    }
    setSaveModal({ open: true, filename: defaultName, blob, extension });
  }, [addToast, t]);

  const confirmSave = () => {
    if (!saveModal) return;
    const filename = saveModal.filename.endsWith(`.${saveModal.extension}`)
      ? saveModal.filename
      : `${saveModal.filename}.${saveModal.extension}`;
    downloadBlob(saveModal.blob, filename);
    setSaveModal(null);
    addToast(t('results.fileExported'), 'success');
  };

  const handleCSV = useCallback(async () => {
    try {
      const sections = buildSections(activeTab, results, t);
      const lines: string[] = [];
      const org = results?.matches?.[0]?.organization || '';
      const date = results?.matches?.[0]?.date;
      lines.push(`Cup: ${cupName} (${org})`);
      lines.push(`Matches: ${results?.matches?.length ?? 0}  |  Minimum: ${results?.minimum_matches ?? 0}`);
      if (date) lines.push(`Started: ${formatDateLong(date)}`);
      lines.push('');
      for (const section of sections) {
        if (section.subtitle) {
          lines.push(`--- ${section.title} (${section.subtitle}) ---`);
        } else {
          lines.push(`--- ${section.title} ---`);
        }
        lines.push(section.head.join(';'));
        for (const row of section.rows) {
          lines.push(row.map((cell) => (cell == null ? '' : cell)).join(';'));
        }
        lines.push('');
      }
      const csv = '\uFEFF' + lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      await showSaveDialog(blob, `${baseName}_${tabSuffix}.csv`, 'csv', [
        { description: 'CSV file', accept: { 'text/csv': ['.csv'] } },
      ], 'results.csvExported');
    } catch (err: any) { addToast(err.message, 'error'); }
  }, [activeTab, results, cupName, baseName, tabSuffix, showSaveDialog, addToast, t]);

  const handleHTML = useCallback(async () => {
    try {
      const sections = buildSections(activeTab, results, t);
      const parts: string[] = [];
      parts.push(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${cupName} Results</title>
<style>
body{font-family:Arial,sans-serif;margin:20px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ddd;padding:8px;text-align:left}
th{background:#f4f4f4}
tr:nth-child(even){background:#f9f9f9}
.section{margin-bottom:24px;page-break-after:always}
.section:last-child{page-break-after:auto}
.section h2{margin:0 0 12px}
.section h3{margin:16px 0 8px;color:#555}
.dq-section{background:#fff0f0}
.dq-section th{background:#ffcccc}
</style></head><body>
<h1>${cupName} ${results?.matches?.[0]?.organization ? `(${results.matches[0].organization})` : ''}</h1>
<p>Matches: ${results?.matches?.length ?? 0} | Minimum: ${results?.minimum_matches ?? 0}</p>`);
      for (const section of sections) {
        parts.push(`<div class="section"><h2>${section.title}</h2>`);
        if (section.subtitle) parts.push(`<h3>${section.subtitle}</h3>`);
        parts.push(`<table><tr>${section.head.map((h) => `<th>${h}</th>`).join('')}</tr>`);
        for (const row of section.rows) {
          parts.push(`<tr>${row.map((cell) => `<td>${cell ?? ''}</td>`).join('')}</tr>`);
        }
        parts.push('</table></div>');
      }
      parts.push('</body></html>');
      const blob = new Blob([parts.join('\n')], { type: 'text/html' });
      await showSaveDialog(blob, `${baseName}_${tabSuffix}.html`, 'html', [
        { description: 'HTML file', accept: { 'text/html': ['.html'] } },
      ], 'results.htmlExported');
    } catch (err: any) { addToast(err.message, 'error'); }
  }, [activeTab, results, cupName, baseName, tabSuffix, showSaveDialog, addToast, t]);

  const handlePDF = useCallback(async () => {
    try {
      const sections = buildSections(activeTab, results, t);
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      await loadPdfFonts(doc);
      const org = results?.matches?.[0]?.organization || '';
      const date = results?.matches?.[0]?.date;

      const drawHeader = (data?: any) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        setBoldFont(doc); doc.setFontSize(16);
        doc.text(cupName, pageWidth / 2, 8, { align: 'center' });
        setRegularFont(doc); doc.setFontSize(9);
        const subtitle = [org, formatDateLong(date)].filter(Boolean).join(' • ');
        if (subtitle) doc.text(subtitle, pageWidth / 2, 13, { align: 'center' });
        doc.setDrawColor(0); doc.line(MARGIN, 16, pageWidth - MARGIN, 16);
        if (data?.settings) data.settings.startY = 20;
      };

      drawHeader();
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (i > 0) { doc.addPage(); drawHeader(); }
        setBoldFont(doc); doc.setFontSize(TITLE_SIZE);
        doc.text(section.title, MARGIN, 32);
        let startY = 36;
        if (section.subtitle) {
          setRegularFont(doc); doc.setFontSize(SUBTITLE_SIZE);
          doc.text(section.subtitle, MARGIN, startY);
          startY += 6;
        }
        setRegularFont(doc);
        autoTable(doc, {
          ...TABLE_STYLE,
          startY,
          margin: { left: MARGIN, right: MARGIN },
          head: [section.head],
          body: section.rows.map((row) => row.map((cell) => (cell == null ? '' : cell))),
          didDrawPage: (data: any) => { drawHeader(data); },
        });
      }
      const pdfBlob = doc.output('blob');
      await showSaveDialog(pdfBlob, `${baseName}_${tabSuffix}.pdf`, 'pdf', [
        { description: 'PDF file', accept: { 'application/pdf': ['.pdf'] } },
      ], 'results.pdfExported');
    } catch (err: any) {
      console.error('Cup PDF export error:', err);
      addToast(err.message, 'error');
    }
  }, [activeTab, results, cupName, baseName, tabSuffix, showSaveDialog, addToast, t]);

  return { handlePrint, handlePDF, handleCSV, handleHTML, saveModal, setSaveModal, confirmSave };
};

export default useCupExport;
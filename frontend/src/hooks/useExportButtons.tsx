import { useCallback, useState } from "react";
import { useTabMenuAction } from "./useTabMenuAction";
import { useUIStore } from "../stores/uiStore";
import { useMatchStore } from "../stores/matchStore";
import { useResultsStore } from "../stores/resultsStore";
import { categoryLabel, divisionLabel } from "../utils/constants";
import { hasHitFactor } from "../utils/hitFactor";
import { nativeSaveAs, saveBlobToDevice, formatDateLong, MARGIN, TITLE_SIZE, SUBTITLE_SIZE, TABLE_STYLE } from "../utils/exportUtils";
import { useTranslation } from "react-i18next";
import { loadPdfFonts, setBoldFont, setRegularFont } from "../utils/pdfFont";
import { triggerPrint } from "../utils/print";
import { columnHeader, cellValue, type ColumnKey } from "../components/results/ResultsTable";
import {
  divisionAppliesForRows,
  resultColumns,
  resultsProfileOfRows,
  ringValuesOfRows,
} from "../utils/resultsProfile";


type ResultTab = 'byDivision' | 'overall' | 'byStage' | 'byCategory' | 'byTag';

export interface ExportButtonsProps {
  activeTab: ResultTab;
}

export interface SaveProps { open: boolean; filename: string; blob: Blob; extension: string }

const TAB_SUFFIX: Record<ResultTab, string> = {
  byDivision: 'by_division',
  overall: 'overall',
  byStage: 'by_stage',
  byCategory: 'by_category',
  byTag: 'by_tag',
};

// ── Shared column selection ──────────────────────────────────────────
// The same helpers drive CSV, HTML and PDF so the three formats always show
// the same scoring breakdown as the on-screen table.

function matchColumns(rows: any[], includeDivision: boolean): ColumnKey[] {
  const profile = resultsProfileOfRows(rows);
  return resultColumns(profile, {
    division: includeDivision && divisionAppliesForRows(rows),
    hasHitFactor: profile === 'zone' && hasHitFactor(rows),
    ringValues: ringValuesOfRows(rows),
  });
}

function stageColumns(rows: any[], includeDivision: boolean): ColumnKey[] {
  const profile = resultsProfileOfRows(rows);
  return resultColumns(profile, {
    stage: true,
    division: includeDivision && divisionAppliesForRows(rows),
    hasHitFactor: profile === 'zone' && hasHitFactor(rows),
    ringValues: ringValuesOfRows(rows),
  });
}

function scoreColumns(columns: ColumnKey[]): ColumnKey[] {
  return columns.filter((col) => col !== 'position' && col !== 'shooter' && col !== 'division');
}

function hasDivisionColumn(columns: ColumnKey[]): boolean {
  return columns.includes('division');
}

type Translator = (key: string, opts?: any) => string;

interface CsvMatchOptions {
  includeDivision: boolean;
  includeProfile: boolean;
}

function csvMatch(rows: any[], options: CsvMatchOptions, t: Translator) {
  const columns = matchColumns(rows, options.includeDivision);
  const scores = scoreColumns(columns);
  const header = [
    'Position', 'First Name', 'Last Name',
    ...(hasDivisionColumn(columns) ? ['Division'] : []),
    ...(options.includeProfile ? ['Category', 'Power Factor'] : []),
    ...scores.map((col) => columnHeader(col, t)),
  ].join(';');

  const lines = rows.map((r) => [
    r.position,
    r.first_name,
    r.last_name,
    ...(hasDivisionColumn(columns) ? [divisionLabel(r.division || '')] : []),
    ...(options.includeProfile ? [categoryLabel(r.category || ''), r.power_factor || ''] : []),
    ...scores.map((col) => cellValue(col, r)),
  ].join(';'));

  return { header, lines };
}

function csvStage(rows: any[], includeDivision: boolean, t: Translator) {
  const columns = stageColumns(rows, includeDivision);
  const scores = scoreColumns(columns);
  const header = [
    'Position', 'First Name', 'Last Name',
    ...(hasDivisionColumn(columns) ? ['Division'] : []),
    ...scores.map((col) => columnHeader(col, t)),
  ].join(';');

  const lines = rows.map((r) => [
    r.position,
    r.first_name,
    r.last_name,
    ...(hasDivisionColumn(columns) ? [divisionLabel(r.division || '')] : []),
    ...scores.map((col) => cellValue(col, r)),
  ].join(';'));

  return { header, lines };
}

function htmlTable(rows: any[], columns: ColumnKey[], t: Translator): string {
  const head = `<tr>${columns.map((col) => `<th>${columnHeader(col, t)}</th>`).join('')}</tr>`;
  const body = rows.map((r) => (
    `<tr>${columns.map((col) => `<td>${cellValue(col, r)}</td>`).join('')}</tr>`
  )).join('');
  return `<table>${head}${body}</table>`;
}

function htmlMatchTable(rows: any[], includeDivision: boolean, t: Translator): string {
  return htmlTable(rows, matchColumns(rows, includeDivision), t);
}

function htmlStageTable(rows: any[], includeDivision: boolean, t: Translator): string {
  return htmlTable(rows, stageColumns(rows, includeDivision), t);
}

function dqCsv(rows: any[], includeProfile: boolean): { header: string; lines: string[] } {
  const showDivision = divisionAppliesForRows(rows);
  const header = [
    'First Name', 'Last Name',
    ...(showDivision ? ['Division'] : []),
    ...(includeProfile ? ['Category', 'Power Factor'] : []),
    'DQ Reason',
  ].join(';');
  const lines = rows.map((r) => [
    r.first_name,
    r.last_name,
    ...(showDivision ? [divisionLabel(r.division || '')] : []),
    ...(includeProfile ? [categoryLabel(r.category || ''), r.power_factor || ''] : []),
    r.dq_reason || 'DQ',
  ].join(';'));
  return { header, lines };
}

function dqHtml(rows: any[], includeProfile: boolean, t: Translator): string {
  const showDivision = divisionAppliesForRows(rows);
  const head = `<tr><th>${t('results.shooter')}</th>${showDivision ? `<th>${t('results.division')}</th>` : ''}${includeProfile ? `<th>${t('shooters.category')}</th>` : ''}<th>${t('results.dqReason')}</th></tr>`;
  const body = rows.map((r) => (
    `<tr><td>${r.first_name} ${r.last_name}</td>${showDivision ? `<td>${divisionLabel(r.division || '')}</td>` : ''}${includeProfile ? `<td>${categoryLabel(r.category || '')}</td>` : ''}<td>${r.dq_reason || 'DQ'}</td></tr>`
  )).join('');
  return `<table class="dq-section">${head}${body}</table>`;
}

// ── PDF table helpers ────────────────────────────────────────────────

function pdfMatchTable(rows: any[], includeDivision: boolean, t: Translator) {
  const columns = matchColumns(rows, includeDivision);
  return {
    columns,
    head: [columns.map((col) => columnHeader(col, t))],
    body: rows.map((r) => columns.map((col) => cellValue(col, r))),
  };
}

function pdfStageTable(rows: any[], includeDivision: boolean, t: Translator) {
  const columns = stageColumns(rows, includeDivision);
  return {
    columns,
    head: [columns.map((col) => columnHeader(col, t))],
    body: rows.map((r) => columns.map((col) => cellValue(col, r))),
  };
}

function pdfDqTable(rows: any[], t: Translator, extraColumns: boolean) {
  const showDivision = divisionAppliesForRows(rows);
  return {
    head: [[
      t('results.shooter'),
      ...(showDivision ? [t('results.division')] : []),
      ...(extraColumns ? ['HF', t('results.netPoints')] : []),
      t('results.dqReason'),
    ]],
    body: rows.map((r) => [
      `${r.first_name} ${r.last_name}`,
      ...(showDivision ? [divisionLabel(r.division || '')] : []),
      ...(extraColumns ? [Number(r.hit_factor).toFixed(4), Number(r.net_points).toFixed(2)] : []),
      r.dq_reason || 'DQ',
    ]),
  };
}

const useExportButtons = (activeTab: ResultTab) => {
    const { t } = useTranslation();
  
    const [pdfLoading, setPdfLoading] = useState(false);
    const [saveModal, setSaveModal] = useState<SaveProps | null>(null);
    const activeMatchId = useUIStore((s) => s.activeMatchId);
    const addToast = useUIStore((s) => s.addToast);
    const matches = useMatchStore((s) => s.matches);
  
  
    const activeMatch = matches?.find((m: any) => m.id === activeMatchId);
    const baseName = (activeMatch?.name || 'Match').replace(/[^a-zA-Z0-9]/g, '_');
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

  const confirmSave = async () => {
    if (!saveModal) return;
    const { blob, extension } = saveModal;
    const filename = saveModal.filename.endsWith(`.${extension}`)
      ? saveModal.filename
      : `${saveModal.filename}.${extension}`;
    setSaveModal(null);
    // On device this writes to Documents/IPSCScore/; in the browser it downloads.
    const saved = await saveBlobToDevice(blob, filename);
    addToast(t(saved ? 'results.fileExported' : 'results.exportFailed'), saved ? 'success' : 'error');
  };

  // ── CSV: client-side generation ──────────────────────────────────────

  const handleCSV = useCallback(async () => {
    if (!activeMatchId) return;
    try {
      const s = useResultsStore.getState();
      const lines: string[] = [];

      switch (activeTab) {
        case 'byDivision': {
          for (const [division, results] of Object.entries(s.divisionResults).sort(([a], [b]) => a.localeCompare(b))) {
            if (divisionAppliesForRows(results as any[])) {
              lines.push(`--- ${divisionLabel(division)} ---`);
            }
            const table = csvMatch(results as any[], { includeDivision: true, includeProfile: true }, t);
            lines.push(table.header, ...table.lines, '');
          }
          if (s.dqDivisions.length) {
            lines.push('--- Disqualified ---');
            const dq = dqCsv(s.dqDivisions as any[], true);
            lines.push(dq.header, ...dq.lines);
          }
          break;
        }
        case 'overall': {
          const table = csvMatch(s.overallResults as any[], { includeDivision: true, includeProfile: true }, t);
          lines.push(table.header, ...table.lines, '');
          if (s.dqOverall.length) {
            lines.push('--- Disqualified ---');
            const dq = dqCsv(s.dqOverall as any[], true);
            lines.push(dq.header, ...dq.lines);
          }
          break;
        }
        case 'byStage': {
          for (const stage of s.stageResults) {
            lines.push(`--- Stage ${stage.stage_number}: ${stage.stage_name} ---`);
            const stageDivisionApplies = (stage as any).division_applies !== false;
            if (stage.divisions && Object.keys(stage.divisions).length > 0) {
              for (const [division, scores] of Object.entries(stage.divisions).sort(([a], [b]) => a.localeCompare(b))) {
                if (stageDivisionApplies) lines.push(divisionLabel(division));
                const table = csvStage(scores as any[], false, t);
                lines.push(table.header, ...table.lines, '');
              }
            } else {
              const table = csvStage((stage.scores || []) as any[], stageDivisionApplies, t);
              lines.push(table.header, ...table.lines, '');
            }
            if (stage.dq_scores?.length) {
              lines.push('--- Disqualified ---');
              const showDivision = divisionAppliesForRows(stage.dq_scores as any[]);
              const hasScoring = (stage as any).scoring_profile === 'zone';
              const header = [
                'First Name', 'Last Name',
                ...(showDivision ? ['Division'] : []),
                ...(hasScoring ? ['HF', 'Net Points'] : []),
                'DQ Reason',
              ].join(';');
              lines.push(header);
              for (const r of stage.dq_scores as any[]) {
                lines.push([
                  r.first_name, r.last_name,
                  ...(showDivision ? [divisionLabel(r.division || '')] : []),
                  ...(hasScoring ? [Number(r.hit_factor).toFixed(4), Number(r.net_points).toFixed(2)] : []),
                  r.dq_reason || 'DQ',
                ].join(';'));
              }
              lines.push('');
            }
          }
          break;
        }
        case 'byCategory': {
          for (const [cat, divisions] of Object.entries(s.categoryResults).sort(([a], [b]) => a.localeCompare(b))) {
            lines.push(`--- ${categoryLabel(cat)} ---`);
            for (const [division, results] of Object.entries(divisions as Record<string, any[]>).sort(([a], [b]) => a.localeCompare(b))) {
              if (divisionAppliesForRows(results)) lines.push(divisionLabel(division));
              const table = csvMatch(results, { includeDivision: false, includeProfile: false }, t);
              lines.push(table.header, ...table.lines, '');
            }
          }
          if (s.dqCategories.length) {
            lines.push('--- Disqualified ---');
            const dq = dqCsv(s.dqCategories as any[], true);
            lines.push(dq.header, ...dq.lines);
          }
          break;
        }
        case 'byTag': {
          for (const [tag, divisions] of Object.entries(s.tagResults).sort(([a], [b]) => a.localeCompare(b))) {
            lines.push(`--- Tag: ${tag} ---`);
            for (const [division, results] of Object.entries(divisions as Record<string, any[]>).sort(([a], [b]) => a.localeCompare(b))) {
              if (divisionAppliesForRows(results)) lines.push(divisionLabel(division));
              const table = csvMatch(results, { includeDivision: false, includeProfile: false }, t);
              lines.push(table.header, ...table.lines, '');
            }
          }
          if (s.dqTags.length) {
            lines.push('--- Disqualified ---');
            const dq = dqCsv(s.dqTags as any[], true);
            lines.push(dq.header, ...dq.lines);
          }
          break;
        }
      }

      const matchHeader = [
        `Match: ${activeMatch?.name || 'Match'} (${activeMatch?.organization || ''})`,
        `Date: ${formatDateLong(activeMatch?.date)}`,
        '',
      ].join('\n');

      const csv = '\uFEFF' + matchHeader + lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      await showSaveDialog(blob, `${baseName}_${tabSuffix}.csv`, 'csv', [
        { description: 'CSV file', accept: { 'text/csv': ['.csv'] } },
      ], 'results.csvExported');
    } catch (err: any) { addToast(err.message, 'error'); }
  }, [activeMatchId, activeTab, activeMatch, baseName, tabSuffix, showSaveDialog, addToast, t]);

  // ── HTML: client-side generation ─────────────────────────────────────

  const handleHTML = useCallback(async () => {
    if (!activeMatchId) return;
    try {
      const s = useResultsStore.getState();
      const parts: string[] = [];

      parts.push(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeMatch?.name || 'Match'} Results</title>
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
<h1>${activeMatch?.name || 'Match'} (${activeMatch?.organization || ''})</h1>
<p>Date: ${formatDateLong(activeMatch?.date)}</p>`);

      switch (activeTab) {
        case 'byDivision': {
          for (const [division, results] of Object.entries(s.divisionResults).sort(([a], [b]) => a.localeCompare(b))) {
            parts.push(`<div class="section">${divisionAppliesForRows(results as any[]) ? `<h2>${divisionLabel(division)}</h2>` : ''}${htmlMatchTable(results as any[], true, t)}</div>`);
          }
          if (s.dqDivisions.length) {
            parts.push(`<div class="section dq-section"><h2>${t('results.disqualified')}</h2>${dqHtml(s.dqDivisions as any[], true, t)}</div>`);
          }
          break;
        }
        case 'overall': {
          parts.push(`<div class="section"><h2>${t('results.overall')}</h2>${htmlMatchTable(s.overallResults as any[], true, t)}</div>`);
          if (s.dqOverall.length) {
            parts.push(`<div class="section dq-section"><h2>${t('results.disqualified')}</h2>${dqHtml(s.dqOverall as any[], true, t)}</div>`);
          }
          break;
        }
        case 'byStage': {
          for (const stage of s.stageResults) {
            parts.push(`<div class="section"><h2>${t('scoring.stage', { number: stage.stage_number })}: ${stage.stage_name}</h2>`);
            const stageDivisionApplies = (stage as any).division_applies !== false;
            if (stage.divisions && Object.keys(stage.divisions).length > 0) {
              for (const [division, scores] of Object.entries(stage.divisions).sort(([a], [b]) => a.localeCompare(b))) {
                if (stageDivisionApplies) parts.push(`<h3>${divisionLabel(division)}</h3>`);
                parts.push(htmlStageTable(scores as any[], false, t));
              }
            } else {
              parts.push(htmlStageTable((stage.scores || []) as any[], stageDivisionApplies, t));
            }
            if (stage.dq_scores?.length) {
              const showDivision = divisionAppliesForRows(stage.dq_scores as any[]);
              const hasScoring = (stage as any).scoring_profile === 'zone';
              const head = `<tr><th>${t('results.shooter')}</th>${showDivision ? `<th>${t('results.division')}</th>` : ''}${hasScoring ? `<th>HF</th><th>${t('results.netPoints')}</th>` : ''}<th>${t('results.dqReason')}</th></tr>`;
              const body = (stage.dq_scores as any[]).map((r) => (
                `<tr><td>${r.first_name} ${r.last_name}</td>${showDivision ? `<td>${divisionLabel(r.division || '')}</td>` : ''}${hasScoring ? `<td>${Number(r.hit_factor).toFixed(4)}</td><td>${Number(r.net_points).toFixed(2)}</td>` : ''}<td>${r.dq_reason || 'DQ'}</td></tr>`
              )).join('');
              parts.push(`<h3>${t('results.disqualified')}</h3><table class="dq-section">${head}${body}</table>`);
            }
            parts.push('</div>');
          }
          break;
        }
        case 'byCategory': {
          for (const [cat, divisions] of Object.entries(s.categoryResults).sort(([a], [b]) => a.localeCompare(b))) {
            parts.push(`<div class="section"><h2>${categoryLabel(cat)}</h2>`);
            for (const [division, results] of Object.entries(divisions as Record<string, any[]>).sort(([a], [b]) => a.localeCompare(b))) {
              if (divisionAppliesForRows(results)) parts.push(`<h3>${divisionLabel(division)}</h3>`);
              parts.push(htmlMatchTable(results, false, t));
            }
            parts.push('</div>');
          }
          if (s.dqCategories.length) {
            parts.push(`<div class="section dq-section"><h2>${t('results.disqualified')}</h2>${dqHtml(s.dqCategories as any[], true, t)}</div>`);
          }
          break;
        }
        case 'byTag': {
          for (const [tag, divisions] of Object.entries(s.tagResults).sort(([a], [b]) => a.localeCompare(b))) {
            parts.push(`<div class="section"><h2>${t('results.tag', { tag })}</h2>`);
            for (const [division, results] of Object.entries(divisions as Record<string, any[]>).sort(([a], [b]) => a.localeCompare(b))) {
              if (divisionAppliesForRows(results)) parts.push(`<h3>${divisionLabel(division)}</h3>`);
              parts.push(htmlMatchTable(results, false, t));
            }
            parts.push('</div>');
          }
          if (s.dqTags.length) {
            parts.push(`<div class="section dq-section"><h2>${t('results.disqualified')}</h2>${dqHtml(s.dqTags as any[], true, t)}</div>`);
          }
          break;
        }
      }

      parts.push('</body></html>');
      const html = parts.join('\n');
      const blob = new Blob([html], { type: 'text/html' });
      await showSaveDialog(blob, `${baseName}_${tabSuffix}.html`, 'html', [
        { description: 'HTML file', accept: { 'text/html': ['.html'] } },
      ], 'results.htmlExported');
    } catch (err: any) { addToast(err.message, 'error'); }
  }, [activeMatchId, activeTab, activeMatch, baseName, tabSuffix, showSaveDialog, addToast, t]);

  // ── PDF: client-side generation with fresh state ─────────────────────

  const handlePDF = useCallback(async () => {
    if (!activeMatchId) return;
    setPdfLoading(true);
    try {
      const s = useResultsStore.getState();
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      await loadPdfFonts(doc);
      setBoldFont(doc);

      const matchName = activeMatch?.name || 'Match';
      const matchDate = formatDateLong(activeMatch?.date);
      const matchOrg = activeMatch?.organization || '';

      const drawHeader = (data?: any) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        setBoldFont(doc); doc.setFontSize(16);
        doc.text(matchName, pageWidth / 2, 8, { align: 'center' });
        setRegularFont(doc); doc.setFontSize(9);
        const subtitle = [matchOrg, matchDate].filter(Boolean).join(' • ');
        if (subtitle) doc.text(subtitle, pageWidth / 2, 13, { align: 'center' });
        doc.setDrawColor(0); doc.line(MARGIN, 16, pageWidth - MARGIN, 16);
        if (data?.settings) data.settings.startY = 20;
      };

      drawHeader();

      switch (activeTab) {
        case 'byDivision': drawDivisionPDF(doc, autoTable, drawHeader, s.divisionResults, s.dqDivisions, t); break;
        case 'overall': drawOverallPDF(doc, autoTable, drawHeader, s.overallResults, s.dqOverall, t); break;
        case 'byStage': drawStagePDF(doc, autoTable, drawHeader, s.stageResults, t); break;
        case 'byCategory': drawCategoryPDF(doc, autoTable, drawHeader, s.categoryResults, s.dqCategories, t); break;
        case 'byTag': drawTagPDF(doc, autoTable, drawHeader, s.tagResults, s.dqTags, t); break;
      }

      const pdfBlob = doc.output('blob');
      await showSaveDialog(pdfBlob, `${baseName}_${tabSuffix}.pdf`, 'pdf', [
        { description: 'PDF file', accept: { 'application/pdf': ['.pdf'] } },
      ], 'results.pdfExported');
    } catch (err: any) {
      console.error('PDF export error:', err);
      addToast(err.message, 'error');
    } finally { setPdfLoading(false); }
  }, [activeMatchId, activeTab, activeMatch, baseName, tabSuffix, showSaveDialog, addToast, t]);

  useTabMenuAction('print-results', handlePrint);
  useTabMenuAction('export-results-pdf', () => { if (activeMatchId) handlePDF(); });
  useTabMenuAction('export-results-csv', () => { if (activeMatchId) handleCSV(); });
  useTabMenuAction('export-results-html', () => { if (activeMatchId) handleHTML(); });

  return {
    handlePrint,
    handlePDF,
    pdfLoading,
    handleCSV,
    handleHTML,
    saveModal,
    setSaveModal,
    confirmSave,
  }
}

export default useExportButtons;


// ── PDF drawing helpers (black & white only) ──────────────────────────

function drawDivisionPDF(doc: any, autoTable: any, drawHeader: any, divisionResults: Record<string, any[]>, dqShooters: any[], t: Translator) {
  const divisions = Object.entries(divisionResults).sort(([a], [b]) => a.localeCompare(b));
  for (let i = 0; i < divisions.length; i++) {
    const [division, results] = divisions[i];
    if (i > 0) { doc.addPage(); drawHeader(); }
    if (divisionAppliesForRows(results)) {
      setBoldFont(doc); doc.setFontSize(TITLE_SIZE); doc.text(divisionLabel(division), MARGIN, 32);
    }
    setRegularFont(doc);
    const table = pdfMatchTable(results, true, t);
    autoTable(doc, {
      ...TABLE_STYLE,
      startY: divisionAppliesForRows(results) ? 36 : 32,
      margin: { left: MARGIN, right: MARGIN },
      head: table.head,
      body: table.body,
      didDrawPage: (data: any) => { drawHeader(data); },
    });
  }
  if (dqShooters?.length) {
    doc.addPage(); drawHeader();
    setBoldFont(doc); doc.setFontSize(TITLE_SIZE);
    doc.text(`⛔ ${t('results.disqualified')}`, MARGIN, 32);
    setRegularFont(doc);
    const dq = pdfDqTable(dqShooters, t, false);
    autoTable(doc, {
      ...TABLE_STYLE,
      startY: 36,
      margin: { left: MARGIN, right: MARGIN },
      head: dq.head,
      body: dq.body,
    });
  }
}

function drawOverallPDF(doc: any, autoTable: any, drawHeader: any, results: any[], dqShooters: any[], t: Translator) {
  if (!results.length) return;
  setBoldFont(doc); doc.setFontSize(TITLE_SIZE); doc.text(t('results.overall'), MARGIN, 32);
  setRegularFont(doc);
  const table = pdfMatchTable(results, true, t);
  autoTable(doc, {
    ...TABLE_STYLE,
    startY: 36,
    margin: { left: MARGIN, right: MARGIN },
    head: table.head,
    body: table.body,
    didDrawPage: (data: any) => { drawHeader(data); },
  });
  if (dqShooters?.length) {
    doc.addPage(); drawHeader();
    setBoldFont(doc); doc.setFontSize(TITLE_SIZE);
    doc.text(`⛔ ${t('results.disqualified')}`, MARGIN, 32);
    setRegularFont(doc);
    const dq = pdfDqTable(dqShooters, t, false);
    autoTable(doc, {
      ...TABLE_STYLE,
      startY: 36,
      margin: { left: MARGIN, right: MARGIN },
      head: dq.head,
      body: dq.body,
    });
  }
}

function drawStagePDF(doc: any, autoTable: any, drawHeader: any, stageResults: any[], t: Translator) {
  for (let i = 0; i < stageResults.length; i++) {
    const stage = stageResults[i];
    if (i > 0) { doc.addPage(); drawHeader(); }
    setBoldFont(doc); doc.setFontSize(TITLE_SIZE);
    doc.text(`${t('scoring.stage', { number: stage.stage_number })}: ${stage.stage_name}`, MARGIN, 32);

    const stageDivisionApplies = stage.division_applies !== false;

    if (stage.divisions && Object.keys(stage.divisions).length > 0) {
      const divEntries = Object.entries(stage.divisions as Record<string, any[]>).sort(([a], [b]) => a.localeCompare(b));
      let currentY = 36;
      for (const [division, scores] of divEntries) {
        setBoldFont(doc); doc.setFontSize(SUBTITLE_SIZE);
        if (currentY > 36) currentY += 4;
        if (stageDivisionApplies) {
          doc.text(divisionLabel(division), MARGIN, currentY);
          currentY += 4;
        }
        setRegularFont(doc);
        const table = pdfStageTable(scores, false, t);
        autoTable(doc, {
          ...TABLE_STYLE,
          startY: currentY, head: table.head, body: table.body,
          margin: { left: MARGIN, right: MARGIN },
          didDrawPage: (data: any) => { drawHeader(data); },
        });
        currentY = (doc as any).lastAutoTable.finalY + 6;
        if (currentY > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); drawHeader(); currentY = 32; }
      }
    } else {
      setRegularFont(doc);
      const table = pdfStageTable(stage.scores || [], stageDivisionApplies, t);
      autoTable(doc, {
        ...TABLE_STYLE,
        startY: 36, head: table.head, body: table.body,
        margin: { left: MARGIN, right: MARGIN },
        didDrawPage: (data: any) => { drawHeader(data); },
      });
    }

    if (stage.dq_scores?.length) {
      let currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 36;
      if (currentY > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); drawHeader(); currentY = 32; }
      setBoldFont(doc); doc.setFontSize(SUBTITLE_SIZE);
      doc.text(`⛔ ${t('results.disqualified')}`, MARGIN, currentY);
      setRegularFont(doc);
      const dq = pdfDqTable(stage.dq_scores, t, stage.scoring_profile === 'zone');
      autoTable(doc, {
        ...TABLE_STYLE,
        startY: currentY + 4,
        margin: { left: MARGIN, right: MARGIN },
        head: dq.head,
        body: dq.body,
      });
    }
  }
}

function drawCategoryPDF(doc: any, autoTable: any, drawHeader: any, categoryResults: Record<string, Record<string, any[]>>, dqCategories: any[], t: Translator) {
  const catEntries = Object.entries(categoryResults).sort(([a], [b]) => a.localeCompare(b));
  for (const [cat, divisions] of catEntries) {
    doc.addPage(); drawHeader();
    setBoldFont(doc); doc.setFontSize(TITLE_SIZE); doc.text(categoryLabel(cat), MARGIN, 32);
    let currentY = 36;
    for (const [division, results] of Object.entries(divisions).sort(([a], [b]) => a.localeCompare(b))) {
      setBoldFont(doc); doc.setFontSize(SUBTITLE_SIZE);
      if (currentY > 36) currentY += 4;
      if (divisionAppliesForRows(results)) {
        doc.text(divisionLabel(division), MARGIN, currentY);
        currentY += 4;
      }
      setRegularFont(doc);
      const table = pdfMatchTable(results, false, t);
      autoTable(doc, {
        ...TABLE_STYLE,
        startY: currentY,
        margin: { left: MARGIN, right: MARGIN },
        head: table.head,
        body: table.body,
        didDrawPage: (data: any) => { drawHeader(data); },
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
      if (currentY > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); drawHeader(); currentY = 32; }
    }
  }
  if (dqCategories?.length) {
    doc.addPage(); drawHeader();
    setBoldFont(doc); doc.setFontSize(TITLE_SIZE);
    doc.text(`⛔ ${t('results.disqualified')} — ${t('results.byCategory')}`, MARGIN, 32);
    setRegularFont(doc);
    const dq = pdfDqTable(dqCategories, t, false);
    autoTable(doc, {
      ...TABLE_STYLE,
      startY: 36,
      margin: { left: MARGIN, right: MARGIN },
      head: dq.head,
      body: dq.body,
    });
  }
}

function drawTagPDF(doc: any, autoTable: any, drawHeader: any, tagResults: Record<string, Record<string, any[]>>, dqTags: any[], t: Translator) {
  const tagEntries = Object.entries(tagResults).sort(([a], [b]) => a.localeCompare(b));
  for (const [tag, divisions] of tagEntries) {
    doc.addPage(); drawHeader();
    setBoldFont(doc); doc.setFontSize(TITLE_SIZE); doc.text(t('results.tag', { tag }), MARGIN, 32);
    let currentY = 36;
    for (const [division, results] of Object.entries(divisions).sort(([a], [b]) => a.localeCompare(b))) {
      setBoldFont(doc); doc.setFontSize(SUBTITLE_SIZE);
      if (currentY > 36) currentY += 4;
      if (divisionAppliesForRows(results)) {
        doc.text(divisionLabel(division), MARGIN, currentY);
        currentY += 4;
      }
      setRegularFont(doc);
      const table = pdfMatchTable(results, false, t);
      autoTable(doc, {
        ...TABLE_STYLE,
        startY: currentY,
        margin: { left: MARGIN, right: MARGIN },
        head: table.head,
        body: table.body,
        didDrawPage: (data: any) => { drawHeader(data); },
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
      if (currentY > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); drawHeader(); currentY = 32; }
    }
  }
  if (dqTags?.length) {
    doc.addPage(); drawHeader();
    setBoldFont(doc); doc.setFontSize(TITLE_SIZE);
    doc.text(`⛔ ${t('results.disqualified')} — ${t('results.byTag')}`, MARGIN, 32);
    setRegularFont(doc);
    const dq = pdfDqTable(dqTags, t, false);
    autoTable(doc, {
      ...TABLE_STYLE,
      startY: 36,
      margin: { left: MARGIN, right: MARGIN },
      head: dq.head,
      body: dq.body,
    });
  }
}
